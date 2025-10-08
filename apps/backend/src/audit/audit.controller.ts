import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { clampLimit, decodeCursor, encodeCursor, PageResult } from "../common/pagination.js";

@UseGuards(JwtAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query("groupId") groupId?: string,
    @Query("actorUserId") actorUserId?: string,
    @Query("action") action?: string,
    @Query("limit") limitQ?: string,
    @Query("cursor") cursorQ?: string,
  ): Promise<PageResult<any>> {
    const limit = clampLimit(Number(limitQ));
    const cursor = decodeCursor(cursorQ);

    const where: any = {
      ...(groupId ? { groupId } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(action ? { action } : {}),
    };

    const items = await this.prisma.auditLog.findMany({
      where: cursor
        ? {
            ...where,
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const next = items.pop()!;
      nextCursor = encodeCursor(next.createdAt, next.id);
    }

    return { items, nextCursor };
  }
}
