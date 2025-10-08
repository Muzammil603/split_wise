import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { clampLimit, decodeCursor, encodeCursor, PageResult } from '../common/pagination.js';
import { AuditService } from '../audit/audit.service.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/expenses")
export class ExpensesController {
  constructor(
    private svc: ExpensesService, 
    private prisma: PrismaService,
    private audit: AuditService
  ) {}
  
  @Get()
  async list(
    @Param("groupId") groupId: string,
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    const items = await this.prisma.expense.findMany({
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { 
        splits: { include: { user: true } }, 
        paidBy: true 
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = encodeCursor(nextItem.createdAt, nextItem.id);
    }

    return { items, nextCursor };
  }

  @Post() async create(@Param("groupId") groupId: string, @Body() body: any) {
    console.log('ExpensesController.create called with:', { groupId, body });
    try {
      const result = await this.svc.add({ ...body, groupId });
      console.log('ExpensesController.create result:', result);

      // Log expense creation
      await this.audit.log({
        actorUserId: body.paidById,
        groupId: groupId,
        action: 'expense.create',
        targetType: 'expense',
        targetId: result.id,
        meta: { 
          amountCents: body.totalCents, 
          currency: body.currency, 
          mode: body.mode,
          note: body.note 
        },
      });

      return result;
    } catch (error) {
      console.error('ExpensesController.create error:', error);
      throw error;
    }
  }

  @Post("test")
  test() {
    console.log('ExpensesController.test called');
    return { message: "Test endpoint working", timestamp: new Date().toISOString() };
  }
}