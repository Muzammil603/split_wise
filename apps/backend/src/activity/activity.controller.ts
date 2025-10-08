import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GroupMemberGuard } from "../groups/members.guard.js";
import { clampLimit, decodeCursor, encodeCursor, PageResult } from "../common/pagination.js";

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller("groups/:groupId/activity")
export class ActivityController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Param("groupId") groupId: string,
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string,
    @Query("type") type?: string // optional filter
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    const where: any = { groupId, ...(type ? { type } : {}) };

    const items = await this.prisma.activity.findMany({
      where: {
        ...where,
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
      select: {
        id: true,
        createdAt: true,
        actorId: true,
        type: true,
        targetType: true,
        targetId: true,
        data: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const next = items.pop()!;
      nextCursor = encodeCursor(next.createdAt, next.id);
    }
    return { items, nextCursor };
  }
}
