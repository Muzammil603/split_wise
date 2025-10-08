import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { AuditService } from '../audit/audit.service.js';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService, GroupMemberGuard, AuditService],
})
export class ExpensesModule {}
