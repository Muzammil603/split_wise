import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

function suggestTransfers(balances: { userId: string; balanceCents: number }[]) {
  const debtors = balances.filter(b=>b.balanceCents<0).map(d=>({userId:d.userId,amt:-d.balanceCents})).sort((a,b)=>b.amt-a.amt);
  const creditors = balances.filter(b=>b.balanceCents>0).map(c=>({userId:c.userId,amt:c.balanceCents})).sort((a,b)=>b.amt-a.amt);
  const out: { fromUserId: string; toUserId: string; amountCents: number }[] = [];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const pay=Math.min(debtors[i].amt,creditors[j].amt);
    out.push({ fromUserId: debtors[i].userId, toUserId: creditors[j].userId, amountCents: pay });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (!debtors[i].amt) i++; if (!creditors[j].amt) j++;
  }
  return out;
}

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/settlements:suggest')
export class SettlementSuggestController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async suggest(@Param('groupId') groupId: string) {
    const rows = await this.prisma.$queryRaw<{ user_id: string; balance_cents: bigint }[]>
      `select user_id, balance_cents from group_balances_view where group_id = ${groupId}`;
    return suggestTransfers(rows.map(r=>({ userId: r.user_id, balanceCents: Number(r.balance_cents) })));
  }
}
