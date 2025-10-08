import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PrismaService } from '../prisma.service.js';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getProfile(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not found in request');
    }
    
    const userData = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    return userData;
  }
}
