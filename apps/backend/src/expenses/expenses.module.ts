import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService, GroupMemberGuard],
})
export class ExpensesModule {}
