import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ExpensesService } from './expenses.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/expenses")
export class ExpensesController {
  constructor(private svc: ExpensesService) {}
  @Post() create(@Param("groupId") groupId: string, @Body() body: any) {
    return this.svc.add({ ...body, groupId });
  }
}