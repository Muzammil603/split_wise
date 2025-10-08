import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GroupMemberGuard } from "./members.guard.js";
import { GroupOwnerGuard } from "./owner.guard.js";
import crypto from "crypto";

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/invites")
export class InvitesController {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  @UseGuards(GroupOwnerGuard)
  @Post()
  async create(@Param("groupId") groupId: string, @Body() body: { email: string; role?: "member"|"owner" }) {
    const token = crypto.randomBytes(24).toString("hex");
    const invite = await this.prisma.invite.create({
      data: { groupId, email: body.email, role: body.role ?? "member", token }
    });
    
    // Send notification to the invited user
    await this.notifications.notifyInviteReceived(invite.id, groupId, body.email);
    
    return { token: invite.token };
  }

  @Post("accept")
  async accept(@Param("groupId") groupId: string, @Body() body: { token: string; userId: string }) {
    const inv = await this.prisma.invite.findFirst({ where: { token: body.token, groupId, usedAt: null } });
    if (!inv) throw new Error("Invalid invite");
    await this.prisma.$transaction([
      this.prisma.groupMember.upsert({
        where: { groupId_userId: { groupId, userId: body.userId } } as any,
        update: { role: inv.role },
        create: { groupId, userId: body.userId, role: inv.role },
      }),
      this.prisma.invite.update({ where: { id: inv.id }, data: { usedAt: new Date() } })
    ]);
    return { ok: true };
  }
}
