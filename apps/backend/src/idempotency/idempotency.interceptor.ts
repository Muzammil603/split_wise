import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, from } from "rxjs";
import { IdempotencyService } from "./idempotency.service.js";
import { map } from "rxjs/operators";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private idem: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const res: any = context.switchToHttp().getResponse();

    // Only apply to mutating methods (POST/PUT/PATCH/DELETE). Here we focus on POST.
    if (req.method !== "POST") return next.handle();

    const key = req.header("Idempotency-Key");
    if (!key) return next.handle(); // no key provided -> behave normally

    // Build a scope: user + method+route
    const userId = req.user?.sub ?? "anon";
    const scope = `user:${userId}|path:${req.method} ${req.route?.path ?? req.originalUrl}`;

    const ctx = {
      key,
      scope,
      method: req.method,
      path: req.originalUrl,
      body: req.body ?? {},
    };

    // Run handler through service
    return from(
      this.idem.run(ctx, async () => {
        // Call the real controller
        const data = await next.handle().toPromise(); // collect downstream result
        // Default statusCode: use res.statusCode (Nest sets it); fallback 200
        const statusCode = res.statusCode || 200;
        return { statusCode, body: data };
      })
    ).pipe(
      map((result) => {
        res.status(result.statusCode);
        return result.body;
      })
    );
  }
}
