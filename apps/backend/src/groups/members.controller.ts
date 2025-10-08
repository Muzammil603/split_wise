import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from './members.guard.js';
import { GroupOwnerGuard } from './owner.guard.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/members')
export class MembersController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(GroupOwnerGuard)
  @Post()
  async add(@Param('groupId') groupId: string, @Body() body: { userId: string; role?: 'member'|'owner' }) {
    return this.prisma.groupMember.create({
      data: { groupId, userId: body.userId, role: body.role ?? 'member' }
    });
  }

  @UseGuards(GroupOwnerGuard)
  @Delete(':userId')
  async remove(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } } as any
    });
  }
}
