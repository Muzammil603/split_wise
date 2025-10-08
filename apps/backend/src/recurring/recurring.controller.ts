import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GroupMemberGuard } from "../groups/members.guard.js";

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/recurring")
export class RecurringController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Param("groupId") groupId: string) {
    return this.prisma.recurringExpense.findMany({
      where: { groupId, active: true }
    });
  }

  @Post()
  async create(
    @Param("groupId") groupId: string, 
    @Body() body: {
      paidById: string;
      amountCents: number;
      currency: string;
      note?: string;
      cron: string;
      beneficiaries?: string[];
    }
  ) {
    return this.prisma.recurringExpense.create({
      data: {
        groupId,
        paidById: body.paidById,
        amountCents: body.amountCents,
        currency: body.currency,
        note: body.note,
        cron: body.cron,
        beneficiaries: body.beneficiaries,
        active: true
      }
    });
  }
}
