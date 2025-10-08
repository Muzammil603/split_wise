import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RedisService } from '../redis/redis.service.js';
import { BalanceWriterService } from '../balances/balance-writer.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { cacheKey } from '../common/cache.util.js';
import { inc, toCents } from '../balances/balance.util.js';
import { suggestTransfers } from '@swp/shared/settlements';

export type RecordSettlementDto = {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currency?: string; // optional, defaulted to 'USD'
  date?: string;     // ISO string; defaults to now
  note?: string;
  method?: string;
};

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    private readonly balances: BalanceWriterService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Create a settlement record (manual entry)
   */
  async record(dto: RecordSettlementDto) {
    const settlement = await this.prisma.settlement.create({
      data: {
        groupId: dto.groupId,
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'USD',
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
      },
    });

    // Update projection: fromUser pays -> their balance improves (+), toUser receives -> their balance decreases (-)
    const deltaMap = new Map<string, bigint>();
    inc(deltaMap, dto.fromUserId, toCents(dto.amountCents));
    inc(deltaMap, dto.toUserId, -toCents(dto.amountCents));

    await this.balances.applyDeltas(dto.groupId, [...deltaMap.entries()].map(([userId, deltaCents]) => ({ userId, deltaCents })));

    // Emit activity
    await this.activity.push({
      groupId: dto.groupId,
      actorId: dto.fromUserId,
      type: "settlement.create",
      targetType: "settlement",
      targetId: settlement.id,
      data: { 
        fromUserId: dto.fromUserId, 
        toUserId: dto.toUserId, 
        amountCents: dto.amountCents, 
        currency: dto.currency, 
        method: dto.method ?? "unknown" 
      },
    });

    // Send notifications
    await this.notifications.notifySettlementRecorded(settlement.id, dto.groupId);

    // Invalidate caches for this group
    await this.redis.client.del(cacheKey.balances(dto.groupId));
    console.log(`[cache] invalidated balances for group ${dto.groupId}`);

    return settlement;
  }

  /**
   * Compute net balances in a group and suggest transfers to settle up.
   * Balances per user are: paid - owed - settledOut + settledIn
   */
  async suggestForGroup(groupId: string) {
    // Amount each user owes from their splits
    const splits = await this.prisma.expenseSplit.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amountCents: true },
    });

    // Amount each user has paid across expenses
    const paid = await this.prisma.expense.groupBy({
      by: ['paidById'],
      where: { groupId },
      _sum: { amountCents: true },
    });

    // Settlements sent and received
    const settleOut = await this.prisma.settlement.groupBy({
      by: ['fromUserId'],
      where: { groupId },
      _sum: { amountCents: true },
    });
    const settleIn = await this.prisma.settlement.groupBy({
      by: ['toUserId'],
      where: { groupId },
      _sum: { amountCents: true },
    });

    // Build balances map: userId -> net cents
    const map = new Map<string, number>();

    for (const s of splits) {
      map.set(s.userId, (map.get(s.userId) ?? 0) - s.amountCents);
    }

    for (const p of paid) {
      const uid = p.paidById!;
      map.set(uid, (map.get(uid) ?? 0) + (p._sum.amountCents ?? 0));
    }

    for (const so of settleOut) {
      const uid = so.fromUserId!;
      map.set(uid, (map.get(uid) ?? 0) - (so._sum.amountCents ?? 0));
    }

    for (const si of settleIn) {
      const uid = si.toUserId!;
      map.set(uid, (map.get(uid) ?? 0) + (si._sum.amountCents ?? 0));
    }

    const balances = [...map.entries()].map(([userId, balanceCents]) => ({ userId, balanceCents }));

    return suggestTransfers(balances);
  }
}