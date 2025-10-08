import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export type NotificationType = 'expense_added' | 'expense_updated' | 'settlement_recorded' | 'invite_received';

export type NotificationPayload = {
  type: NotificationType;
  userId: string;
  groupId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendNotification(payload: NotificationPayload) {
    // Get user's notification preferences
    const prefs = await this.prisma.notificationPref.findUnique({
      where: { userId: payload.userId }
    });

    if (!prefs) {
      // Create default preferences if none exist
      await this.prisma.notificationPref.create({
        data: {
          userId: payload.userId,
          email: true,
          push: true
        }
      });
    }

    // For now, just log the notification (we'll implement actual sending later)
    console.log(`[Notification] ${payload.type}: ${payload.title} - ${payload.body}`, {
      userId: payload.userId,
      groupId: payload.groupId,
      pushEnabled: prefs?.push !== false,
      emailEnabled: prefs?.email !== false
    });
  }

  async notifyExpenseAdded(expenseId: string, groupId: string, paidById: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: true,
        group: true,
        splits: {
          include: { user: true }
        }
      }
    });

    if (!expense) return;

    const amount = (expense.amountCents / 100).toFixed(2);
    const title = `New expense in ${expense.group.name}`;
    const body = `${expense.paidBy.name} added $${amount} ${expense.currency} expense`;

    // Notify all group members except the person who paid
    const members = await this.prisma.groupMember.findMany({
      where: { 
        groupId,
        userId: { not: paidById }
      }
    });

    for (const member of members) {
      await this.sendNotification({
        type: 'expense_added',
        userId: member.userId,
        groupId,
        title,
        body,
        data: { expenseId, amount: expense.amountCents, currency: expense.currency }
      });
    }
  }

  async notifySettlementRecorded(settlementId: string, groupId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: true,
        toUser: true,
        group: true
      }
    });

    if (!settlement) return;

    const amount = (settlement.amountCents / 100).toFixed(2);
    
    // Notify the person who received the payment
    await this.sendNotification({
      type: 'settlement_recorded',
      userId: settlement.toUserId,
      groupId,
      title: `Payment received in ${settlement.group.name}`,
      body: `${settlement.fromUser.name} paid you $${amount} ${settlement.currency}`,
      data: { settlementId, amount: settlement.amountCents, currency: settlement.currency }
    });

    // Notify the person who made the payment
    await this.sendNotification({
      type: 'settlement_recorded',
      userId: settlement.fromUserId,
      groupId,
      title: `Payment sent in ${settlement.group.name}`,
      body: `You paid ${settlement.toUser.name} $${amount} ${settlement.currency}`,
      data: { settlementId, amount: settlement.amountCents, currency: settlement.currency }
    });
  }

  async notifyInviteReceived(inviteId: string, groupId: string, email: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: { group: true }
    });

    if (!invite) return;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) return; // User doesn't exist yet, they'll get notified when they register

    await this.sendNotification({
      type: 'invite_received',
      userId: user.id,
      groupId,
      title: `Invitation to ${invite.group.name}`,
      body: `You've been invited to join ${invite.group.name}`,
      data: { inviteId, token: invite.token }
    });
  }

  async updateNotificationPrefs(userId: string, email?: boolean, push?: boolean) {
    return this.prisma.notificationPref.upsert({
      where: { userId },
      update: {
        email: email !== undefined ? email : undefined,
        push: push !== undefined ? push : undefined
      },
      create: {
        userId,
        email: email ?? true,
        push: push ?? true
      }
    });
  }

  async getNotificationPrefs(userId: string) {
    return this.prisma.notificationPref.findUnique({
      where: { userId }
    });
  }
}
