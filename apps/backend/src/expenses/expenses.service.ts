import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService
  ) {}

  async add(data: {
    groupId: string;
    paidById: string;
    totalCents: number;
    currency: string;
    mode: "equal" | "shares" | "percent" | "exact";
    items?: any[];
    beneficiaries?: string[];
    date?: string;
    note?: string;
  }) {
    const group = await this.prisma.group.findUnique({
      where: { id: data.groupId },
      include: { members: true },
    });
    if (!group) throw new BadRequestException("Group not found");

    const userIds = data.beneficiaries ?? group.members.map((m) => m.userId);
    let splits: { userId: string; amountCents: number }[] = [];

    if (data.mode === "equal") {
      // Simple equal split
      const amountPerUser = Math.floor(data.totalCents / userIds.length);
      const remainder = data.totalCents % userIds.length;
      splits = userIds.map((userId, index) => ({
        userId,
        amountCents: amountPerUser + (index < remainder ? 1 : 0)
      }));
    } else if (data.mode === "exact") {
      splits = data.items!.map((item) => ({ userId: item.userId, amountCents: item.amountCents }));
    } else {
      throw new BadRequestException("Only 'equal' and 'exact' modes are supported for now");
    }

    const expense = await this.prisma.expense.create({
      data: {
        groupId: data.groupId,
        paidById: data.paidById,
        amountCents: data.totalCents,
        currency: data.currency,
        note: data.note,
        date: data.date ? new Date(data.date) : new Date(),
        splits: {
          createMany: {
            data: splits,
          },
        },
      },
      include: {
        paidBy: true,
        group: true,
        splits: {
          include: { user: true }
        }
      },
    });

    console.log(`[Expense] Created expense ${expense.id} for group ${data.groupId}`);

    return expense;
  }
}
