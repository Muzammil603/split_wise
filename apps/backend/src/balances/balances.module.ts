import { Module } from '@nestjs/common';
import { BalancesController } from './balances.controller.js';
import { PrismaService } from '../prisma.service.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@Module({
  controllers: [BalancesController],
  providers: [PrismaService, GroupMemberGuard],
})
export class BalancesModule {}
