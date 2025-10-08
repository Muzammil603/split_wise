import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { equalSplit, sharesSplit, percentSplit } from '@swp/shared/split';
@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

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

    if (data.mode === "equal") splits = equalSplit({ totalCents: data.totalCents, userIds });
    else if (data.mode === "shares") splits = sharesSplit(data.totalCents, data.items!);
    else if (data.mode === "percent") splits = percentSplit(data.totalCents, data.items!);
    else if (data.mode === "exact") {
      const sum = data.items!.reduce((a, x) => a + x.amountCents, 0);
      if (sum !== data.totalCents) throw new BadRequestException("Exact sum mismatch");
      splits = data.items!;
    }

    return this.prisma.expense.create({
      data: {
        groupId: data.groupId,
        paidById: data.paidById,
        amountCents: data.totalCents,
        currency: data.currency,
        date: data.date ? new Date(data.date) : new Date(),
        note: data.note,
        splits: { createMany: { data: splits } },
      },
      include: { splits: true },
    });
  }
}