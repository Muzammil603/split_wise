import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller.js';
import { SettlementSuggestController } from './suggest.controller.js';
import { SettlementsService } from './settlements.service.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RedisService } from '../redis/redis.service.js';
import { BalanceWriterService } from '../balances/balance-writer.service.js';
import { ActivityService } from '../activity/activity.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [SettlementsController, SettlementSuggestController],
  providers: [SettlementsService, PrismaService, GroupMemberGuard, RedisService, BalanceWriterService, ActivityService],
})
export class SettlementsModule {}
