import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, PrismaService, GroupMemberGuard],
})
export class ActivityModule {}
