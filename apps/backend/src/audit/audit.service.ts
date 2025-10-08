import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { chain } from "./hash.util.js";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: {
    actorUserId?: string | null;
    groupId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    meta?: any;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    // fetch previous chain hash (latest record)
    const prev = await this.prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { chainHash: true },
    });
    const prevHash = prev?.chainHash ?? null;
    const { chainHash } = chain(prevHash, {
      at: new Date().toISOString(),
      actorUserId: entry.actorUserId ?? null,
      groupId: entry.groupId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      meta: entry.meta ?? {},
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });

    return this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        groupId: entry.groupId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        meta: entry.meta ?? {},
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        prevHash,
        chainHash,
      },
    });
  }
}
