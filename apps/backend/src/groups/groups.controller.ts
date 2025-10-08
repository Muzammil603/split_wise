import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { clampLimit, decodeCursor, encodeCursor, PageResult } from '../common/pagination.js';
import { AuditService } from '../audit/audit.service.js';

@UseGuards(JwtAuthGuard)
@Controller("groups")
export class GroupsController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  @Post()
  async create(@Body() body: { name: string; currency: string; ownerUserId: string }) {
    const group = await this.prisma.group.create({
      data: {
        name: body.name,
        currency: body.currency,
        createdBy: body.ownerUserId,
        members: { create: { userId: body.ownerUserId, role: "owner" } },
      },
    });

    // Log group creation
    await this.audit.log({
      actorUserId: body.ownerUserId,
      action: 'group.create',
      targetType: 'group',
      targetId: group.id,
      meta: { name: body.name, currency: body.currency },
    });

    return group;
  }

  @Get()
  async list(
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string,
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    const where = {}; // (optionally) filter by membership later
    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const items = await this.prisma.group.findMany({
      where: cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : where,
      take: limit + 1, // fetch one extra to detect next page
      orderBy,
      include: { members: true },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = encodeCursor(nextItem.createdAt, nextItem.id);
    }

    return { items, nextCursor };
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.group.findUnique({ where: { id }, include: { members: true } });
  }
}