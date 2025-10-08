import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ExpensesService } from './expenses.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { clampLimit, decodeCursor, encodeCursor, PageResult } from '../common/pagination.js';
import { AuditService } from '../audit/audit.service.js';
import { RedisService } from '../redis/redis.service.js';
import { cacheKey, nearExpiry } from '../common/cache.util.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/expenses")
export class ExpensesController {
  constructor(
    private svc: ExpensesService, 
    private prisma: PrismaService,
    private audit: AuditService,
    private redis: RedisService
  ) {}
  
  @Get()
  async list(
    @Param("groupId") groupId: string,
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    // Cache only: no cursor + default page size
    if (!cursor && (limit === 20 || !limitQ)) {
      const key = cacheKey.expensesFirstPage(groupId, 20);
      const ttlSeconds = 3;
      const pip = this.redis.client.multi();
      pip.get(key); 
      pip.ttl(key);
      const [cached, ttlLeft] = (await pip.exec())!.map((x: any) => x[1]) as [string|null, number];
      
      if (cached) {
        console.log(`[cache] expenses first page hit ${groupId}`);
        const payload = JSON.parse(cached);
        if (nearExpiry(ttlLeft)) {
          this.recomputeFirstPage(groupId, key, ttlSeconds).catch(() => void 0);
        }
        return payload;
      }
      
      console.log(`[cache] expenses first page miss ${groupId}`);
      return await this.recomputeFirstPage(groupId, key, ttlSeconds);
    }

    // Normal paginated path (no caching)
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

  private async recomputeFirstPage(groupId: string, key: string, ttlSeconds: number) {
    const items = await this.prisma.expense.findMany({
      where: { groupId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21, // +1 to compute nextCursor
      include: { 
        splits: { include: { user: true } }, 
        paidBy: true 
      },
    });
    
    let nextCursor: string | null = null;
    if (items.length > 20) {
      const next = items.pop()!;
      nextCursor = encodeCursor(next.createdAt, next.id);
    }
    
    const payload = { items, nextCursor };
    await this.redis.client.setex(key, ttlSeconds, JSON.stringify(payload));
    return payload;
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