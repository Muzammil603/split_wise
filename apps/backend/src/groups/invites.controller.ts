import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { EmailService } from "../email/email.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GroupMemberGuard } from "./members.guard.js";
import { GroupOwnerGuard } from "./owner.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import crypto from "crypto";

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/invites")
export class InvitesController {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService
  ) {}

  @UseGuards(GroupOwnerGuard)
  @Post()
  async create(
    @Param("groupId") groupId: string, 
    @Body() body: { email: string; role?: "member"|"owner" },
    @CurrentUser() user: { id: string }
  ) {
    const token = crypto.randomBytes(24).toString("hex");
    
    // Get group and inviter information
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true }
    });
    
    const inviter = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true }
    });
    
    const invite = await this.prisma.invite.create({
      data: { groupId, email: body.email, role: body.role ?? "member", token }
    });
    
    // Send notification to the invited user
    await this.notifications.notifyInviteReceived(invite.id, groupId, body.email);
    
    // Send email invitation
    if (group && inviter) {
      await this.emailService.sendGroupInviteEmail(
        body.email,
        group.name,
        inviter.name,
        invite.token
      );
    }
    
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

// Endpoint to get pending invites for a user
@UseGuards(JwtAuthGuard)
@Controller("invites")
export class UserInvitesController {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService
  ) {}

  @Get()
  async getPendingInvites(@CurrentUser() user: { id: string }) {
    // Get the user's email from the database
    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true }
    });

    if (!userData) {
      return [];
    }

    const invites = await this.prisma.invite.findMany({
      where: {
        email: userData.email,
        usedAt: null
      },
      include: {
        group: true
      },
      orderBy: { createdAt: "desc" }
    });

    return invites;
  }
}
