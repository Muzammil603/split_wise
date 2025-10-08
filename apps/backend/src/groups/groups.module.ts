import { Module } from "@nestjs/common";
import { GroupsController } from './groups.controller.js';
import { MembersController } from './members.controller.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from './members.guard.js';
import { GroupOwnerGuard } from './owner.guard.js';

@Module({
  controllers: [GroupsController, MembersController],
  providers: [PrismaService, GroupMemberGuard, GroupOwnerGuard],
})
export class GroupsModule {}