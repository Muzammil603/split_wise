import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller("groups")
export class GroupsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@Body() body: { name: string; currency: string; ownerUserId: string }) {
    return this.prisma.group.create({
      data: {
        name: body.name,
        currency: body.currency,
        createdBy: body.ownerUserId,
        members: { create: { userId: body.ownerUserId, role: "owner" } },
      },
    });
  }

  @Get()
  list() {
    return this.prisma.group.findMany({ include: { members: true } });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.group.findUnique({ where: { id }, include: { members: true } });
  }
}