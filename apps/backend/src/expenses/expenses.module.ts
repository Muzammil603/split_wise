import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { AuditService } from '../audit/audit.service.js';
import { RedisService } from '../redis/redis.service.js';
import { BalanceWriterService } from '../balances/balance-writer.service.js';
import { ActivityService } from '../activity/activity.service.js';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService, GroupMemberGuard, AuditService, RedisService, BalanceWriterService, ActivityService],
})
export class ExpensesModule {}
