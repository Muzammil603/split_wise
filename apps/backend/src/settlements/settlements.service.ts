import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
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
    private readonly notifications: NotificationsService
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

    // Send notifications
    await this.notifications.notifySettlementRecorded(settlement.id, dto.groupId);

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