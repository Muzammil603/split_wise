import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { clampLimit, decodeCursor, encodeCursor, PageResult } from '../common/pagination.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/settlements')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(
    @Param('groupId') groupId: string,
    @Query('limit') limitQ?: string,
    @Query('cursor') cursorQ?: string
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    const items = await this.prisma.settlement.findMany({
      where: {
        groupId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = encodeCursor(nextItem.createdAt, nextItem.id);
    }

    return { items, nextCursor };
  }

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