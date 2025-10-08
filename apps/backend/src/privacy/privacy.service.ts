import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class PrivacyService {
  constructor(private prisma: PrismaService) {}

  /** Export all user-owned data (JSON blobs) */
  async exportUser(userId: string) {
    // basic PII (redact sensitive fields like passwordHash)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true, 
        createdAt: true, 
        deletedAt: true, 
        anonymized: true 
      }
    });

    // memberships
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true, role: true, joinedAt: true }
    });

    // groups the user owns (for awareness)
    const ownedGroups = await this.prisma.group.findMany({
      where: { createdBy: userId },
      select: { id: true, name: true, currency: true, createdAt: true }
    });

    // expenses paid by user
    const expensesPaid = await this.prisma.expense.findMany({
      where: { paidById: userId },
      include: { splits: true }
    });

    // splits owed by user
    const splits = await this.prisma.expenseSplit.findMany({
      where: { userId },
      include: { expense: true }
    });

    // settlements involving user
    const settlementsFrom = await this.prisma.settlement.findMany({ 
      where: { fromUserId: userId } 
    });
    const settlementsTo = await this.prisma.settlement.findMany({ 
      where: { toUserId: userId } 
    });

    // notification preferences
    const notificationPrefs = await this.prisma.notificationPref.findUnique({
      where: { userId }
    });

    return {
      user,
      memberships,
      ownedGroups,
      expensesPaid,
      splits,
      settlementsFrom,
      settlementsTo,
      notificationPrefs,
      generatedAt: new Date().toISOString()
    };
  }

  /** Validate user can delete account: not sole owner of any active group */
  async canDelete(userId: string) {
    // find groups where user is owner
    const ownerIn = await this.prisma.groupMember.findMany({
      where: { userId, role: "owner" },
      select: { groupId: true }
    });
    if (ownerIn.length === 0) return { ok: true };

    // for each group, ensure there is at least one other owner
    const blocking: string[] = [];
    for (const gm of ownerIn) {
      const owners = await this.prisma.groupMember.count({ 
        where: { groupId: gm.groupId, role: "owner" } 
      });
      if (owners <= 1) blocking.push(gm.groupId);
    }
    if (blocking.length) {
      return { ok: false, blockingGroups: blocking };
    }
    return { ok: true };
  }

  /** Soft-delete + anonymize; keep financial records intact */
  async deleteAndAnonymize(userId: string) {
    const check = await this.canDelete(userId);
    if (!check.ok) {
      throw new ForbiddenException({ 
        error: "sole_owner", 
        groups: check.blockingGroups 
      });
    }

    // clear PII (email/name/avatar), mark anonymized
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        anonymized: true,
        name: "Deleted User",
        email: `deleted+${userId}@example.invalid`,
        image: null,
        passwordHash: "!", // unusable
        anonName: "Deleted User",
        anonAvatarUrl: null
      }
    });

    // Remove notification prefs
    await this.prisma.notificationPref.deleteMany({ where: { userId } });

    return { ok: true, deletedAt: now.toISOString() };
  }
}
