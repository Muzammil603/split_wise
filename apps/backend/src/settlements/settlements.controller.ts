import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post()
  async record(
    @Param('groupId') groupId: string,
    @Body() body: {
      fromUserId: string;
      toUserId: string;
      amountCents: number;
      currency?: string;
      date?: string;
      note?: string;
      method?: string;
    },
  ) {
    return this.settlementsService.record({
      groupId,
      ...body,
    });
  }

  @Get('suggest')
  async suggest(@Param('groupId') groupId: string) {
    return this.settlementsService.suggestForGroup(groupId);
  }
}