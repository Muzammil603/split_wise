import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { BalanceWriterService } from "../balances/balance-writer.service.js";
import { ActivityService } from "../activity/activity.service.js";
import { cacheKey } from "../common/cache.util.js";
import { inc, toCents } from "../balances/balance.util.js";

// Inline split functions (temporary fix for missing shared package)
function equalSplit(totalCents: number, userIds: string[]) {
  const amountPerPerson = Math.floor(totalCents / userIds.length);
  const remainder = totalCents - (amountPerPerson * userIds.length);
  
  return userIds.map((userId, index) => ({
    userId,
    amountCents: amountPerPerson + (index < remainder ? 1 : 0)
  }));
}

function percentSplit(totalCents: number, percentages: { userId: string; percent: number }[]) {
  return percentages.map(({ userId, percent }) => ({
    userId,
    amountCents: Math.floor(totalCents * percent / 100)
  }));
}

function sharesSplit(totalCents: number, shares: { userId: string; shares: number }[]) {
  const totalShares = shares.reduce((sum, s) => sum + s.shares, 0);
  return shares.map(({ userId, shares }) => ({
    userId,
    amountCents: Math.floor(totalCents * shares / totalShares)
  }));
}

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private balances: BalanceWriterService,
    private activity: ActivityService
  ) {}

  async add(data: {
    groupId: string;
    paidById: string;
    totalCents: number;
    currency: string;
    mode: "equal" | "shares" | "percent" | "exact";
    items?: any[];
    splits?: any[];
    beneficiaries?: string[];
    date?: string;
    note?: string;
  }) {
    console.log('ExpensesService.add called with data:', JSON.stringify(data, null, 2));
    
    // Validate group exists and user is member
    const group = await this.prisma.group.findFirst({
      where: {
        id: data.groupId,
        members: { some: { userId: data.paidById } },
      },
      include: { members: { include: { user: true } } },
    });

    if (!group) {
      throw new BadRequestException("Group not found or user not a member");
    }

    // Calculate splits based on mode
    let splits: any[] = [];
    const memberIds = group.members.map((m) => m.userId);

    switch (data.mode) {
      case "equal":
        // Use beneficiaries if provided, otherwise use all group members
        const equalMembers = data.beneficiaries && data.beneficiaries.length > 0 ? data.beneficiaries : memberIds;
        splits = equalSplit(data.totalCents, equalMembers);
        break;
      case "shares":
        if (!data.items || data.items.length === 0) {
          throw new BadRequestException("Shares mode requires items");
        }
        const shares = data.items.map((item) => ({
          userId: item.userId,
          shares: item.shares,
        }));
        splits = sharesSplit(data.totalCents, shares);
        break;
      case "percent":
        if (!data.items || data.items.length === 0) {
          throw new BadRequestException("Percent mode requires items");
        }
        const percentages = data.items.map((item) => ({
          userId: item.userId,
          percent: item.percent,
        }));
        splits = percentSplit(data.totalCents, percentages);
        break;
      case "exact":
        // Use splits if provided (from frontend), otherwise use items
        if (data.splits && data.splits.length > 0) {
          splits = data.splits.map((split) => ({
            userId: split.userId,
            amountCents: split.amountCents,
          }));
        } else if (data.items && data.items.length > 0) {
          splits = data.items.map((item) => ({
            userId: item.userId,
            amountCents: item.amountCents,
          }));
        } else {
          throw new BadRequestException("Exact mode requires splits or items");
        }
        break;
      default:
        throw new BadRequestException("Invalid split mode");
    }

    // 1) Create expense + splits in a transaction
    const expense = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId: data.groupId,
          paidById: data.paidById,
          amountCents: data.totalCents,
          currency: data.currency,
          date: data.date ? new Date(data.date) : new Date(),
          note: data.note,
          splits: { createMany: { data: splits.map(s => ({ userId: s.userId, amountCents: s.amountCents })) } },
        },
        include: { splits: true },
      });

      return exp;
    });

    // 2) Update projection: payer +, each beneficiary -
    const deltaMap = new Map<string, bigint>();
    const total = toCents(expense.amountCents);
    inc(deltaMap, expense.paidById, total);
    for (const s of expense.splits) inc(deltaMap, s.userId, -toCents(s.amountCents));

    await this.balances.applyDeltas(data.groupId, [...deltaMap.entries()].map(([userId, deltaCents]) => ({ userId, deltaCents })));

    // 3) Emit activity
    await this.activity.push({
      groupId: data.groupId,
      actorId: data.paidById,
      type: "expense.create",
      targetType: "expense",
      targetId: expense.id,
      data: {
        amountCents: expense.amountCents,
        currency: expense.currency,
        note: expense.note ?? "",
        splitMode: data.mode,
        beneficiaries: expense.splits.map(s => s.userId),
      },
    });

    // 4) Invalidate caches
    const keyBal = cacheKey.balances(data.groupId);
    const keyExpFirst = cacheKey.expensesFirstPage(data.groupId, 20);
    await this.redis.client.del(keyBal, keyExpFirst);
    console.log(`[cache] invalidated balances and expenses for group ${data.groupId}`);

    return expense;
  }
}
