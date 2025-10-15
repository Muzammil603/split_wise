import { Controller, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PrismaService } from '../prisma.service.js';
import { PrivacyService } from '../privacy/privacy.service.js';
import { AuditService } from '../audit/audit.service.js';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private prisma: PrismaService,
    private privacy: PrivacyService,
    private audit: AuditService
  ) {}

  @Get()
  async getProfile(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in request');
    }
    
    const userData = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    return userData;
  }

  @Delete()
  async deleteAccount(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in request');
    }

    const can = await this.privacy.canDelete(userId);
    if (!can.ok) {
      return {
        error: "sole_owner",
        message: "Transfer ownership of these groups before deleting.",
        groups: can.blockingGroups
      };
    }
    
    const result = await this.privacy.deleteAndAnonymize(userId);
    
    // Log the deletion action
    await this.audit.log({
      actorUserId: userId,
      action: "privacy.delete",
      targetType: "user",
      targetId: userId,
      meta: { 
        deletedAt: result.deletedAt,
        anonymized: true 
      },
    });

    return result;
  }
}
