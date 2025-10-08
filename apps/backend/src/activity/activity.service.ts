import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

type ActivityData = Record<string, any>;

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async push(entry: {
    groupId: string;
    actorId?: string | null;
    type: string;
    targetType?: string | null;
    targetId?: string | null;
    data?: ActivityData;
  }) {
    return this.prisma.activity.create({
      data: {
        groupId: entry.groupId,
        actorId: entry.actorId ?? null,
        type: entry.type,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        data: entry.data ?? {},
      },
    });
  }
}
