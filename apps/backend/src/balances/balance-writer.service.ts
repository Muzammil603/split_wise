import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class BalanceWriterService {
  constructor(private prisma: PrismaService) {}

  /** Apply multiple deltas in one transaction */
  async applyDeltas(groupId: string, deltas: { userId: string; deltaCents: bigint }[]) {
    if (!deltas.length) return;

    await this.prisma.$transaction(async (tx) => {
      // Upsert each (groupId,userId) then increment
      for (const d of deltas) {
        await tx.groupBalance.upsert({
          where: { groupId_userId: { groupId, userId: d.userId } },
          update: { balanceCents: { increment: d.deltaCents } },
          create: { groupId, userId: d.userId, balanceCents: d.deltaCents },
        });
      }
    });
  }
}
