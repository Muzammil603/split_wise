import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class GroupOwnerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req: any = ctx.switchToHttp().getRequest();
    if (req.memberRole !== 'owner') throw new ForbiddenException('Owner only');
    return true;
  }
}
