import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  
  async canActivate(ctx: ExecutionContext) {
    const req: any = ctx.switchToHttp().getRequest();
    const groupId = req.params.groupId || req.params.id || req.body.groupId;
    const userId = req.user?.userId;
    
    if (!groupId || !userId) throw new ForbiddenException();
    
    const m = await this.prisma.groupMember.findFirst({ 
      where: { groupId, userId } 
    });
    
    if (!m) throw new ForbiddenException('Not a member of this group');
    
    req.memberRole = m.role;
    return true;
  }
}
