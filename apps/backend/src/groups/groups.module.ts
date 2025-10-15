import { Module } from "@nestjs/common";
import { GroupsController } from './groups.controller.js';
import { MembersController } from './members.controller.js';
import { InvitesController, UserInvitesController } from './invites.controller.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from './members.guard.js';
import { GroupOwnerGuard } from './owner.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuditService } from '../audit/audit.service.js';

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [GroupsController, MembersController, InvitesController, UserInvitesController],
  providers: [PrismaService, GroupMemberGuard, GroupOwnerGuard, AuditService],
})
export class GroupsModule {}