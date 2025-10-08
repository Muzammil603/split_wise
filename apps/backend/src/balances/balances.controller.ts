import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/balances')
export class BalancesController {
  constructor(private prisma: PrismaService) {}
  
  @Get()
  async list(@Param('groupId') groupId: string) {
    try {
      const result = await this.prisma.$queryRaw<
        { group_id: string; user_id: string; balance_cents: bigint }[]
      >`select * from group_balances_view where group_id = ${groupId}`;
      // Convert BigInt to number for JSON serialization
      return result.map(row => ({
        group_id: row.group_id,
        user_id: row.user_id,
        balance_cents: Number(row.balance_cents)
      }));
    } catch (error) {
      console.error('Balances query error:', error);
      throw error;
    }
  }
}
