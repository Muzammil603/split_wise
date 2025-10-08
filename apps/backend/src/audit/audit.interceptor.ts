import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "./audit.service.js";

type Options = {
  action: string;
  targetType?: string;
  resolveTargetId?: (req: any, resBody: any) => string | null;
  pickMeta?: (req: any, resBody: any) => any;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService, private opts: Options) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const actorUserId = req.user?.userId ?? null;
    const groupId = req.params?.groupId ?? req.body?.groupId ?? null;
    const ip = req.ip ?? req.headers["x-forwarded-for"] ?? null;
    const userAgent = req.headers["user-agent"] ?? null;

    return next.handle().pipe(
      tap(async (resBody) => {
        // Only log on success (2xx). If you need status, capture from response.
        const targetId = this.opts.resolveTargetId ? this.opts.resolveTargetId(req, resBody) : null;
        const meta = this.opts.pickMeta ? this.opts.pickMeta(req, resBody) : {};
        await this.audit.log({
          actorUserId,
          groupId,
          action: this.opts.action,
          targetType: this.opts.targetType ?? null,
          targetId,
          meta,
          ip,
          userAgent,
        });
      })
    );
  }
}
