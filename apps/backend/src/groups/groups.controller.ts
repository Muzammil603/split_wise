import { Body, Controller, Get, Param, Post, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { clampLimit, decodeCursor, encodeCursor, PageResult } from '../common/pagination.js';
import { AuditService } from '../audit/audit.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

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
    @CurrentUser() user: { id: string },
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string,
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    // Only show groups where the current user is a member
    const where = {
      members: {
        some: {
          userId: user.id
        }
      }
    };

    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const items = await this.prisma.group.findMany({
      where: cursor
        ? {
            ...where,
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : where,
      take: limit + 1, // fetch one extra to detect next page
      orderBy,
      include: {
        members: {
          include: {
            user: true
          }
        }
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop()!;
      nextCursor = encodeCursor(nextItem.createdAt, nextItem.id);
    }

    return { items, nextCursor };
  }

  @Get(":id")
  async get(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    // Only allow access to groups where the user is a member
    const group = await this.prisma.group.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not a member');
    }

    return group;
  }
}