import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { sha256Base64, stableStringify } from "../common/hash.util.js";

export type IdemContext = {
  key: string;            // Idempotency-Key header
  scope: string;          // e.g., user:<uid>|path:POST /groups/:groupId/expenses
  method: string;
  path: string;           // concrete path with params resolved, e.g., /groups/abc/expenses
  body: any;              // DTO used to create resource (the part that matters)
  ttlMs?: number;         // default 24h
};

@Injectable()
export class IdempotencyService {
  constructor(private prisma: PrismaService) {}

  async run<T>(ctx: IdemContext, fn: () => Promise<{ statusCode: number; body: any }>): Promise<{ statusCode: number; body: any }> {
    const ttlMs = ctx.ttlMs ?? 24 * 60 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    const bodyHash = sha256Base64(stableStringify(ctx.body));

    // transaction to avoid races
    return await this.prisma.$transaction(async (tx) => {
      // Try to find an existing record
      let rec = await tx.idempotencyKey.findUnique({
        where: { key_scope: { key: ctx.key, scope: ctx.scope } } as any,
      });

      if (rec) {
        // If an identical request already completed, replay the response
        if (!rec.inProgress && rec.bodyHash === bodyHash) {
          return {
            statusCode: rec.statusCode,
            body: JSON.parse(Buffer.from(rec.responseBody).toString("utf8")),
          };
        }
        // Same key but different body? Treat as conflict (client bug)
        if (rec.bodyHash !== bodyHash) {
          return { statusCode: 409, body: { error: "Idempotency-Key reused with different payload" } };
        }
        // In-progress: another request is executing. Return 425 to signal retry-after.
        if (rec.inProgress) {
          return { statusCode: 425, body: { error: "Processing", hint: "Retry with same Idempotency-Key" } };
        }
      } else {
        // Create a new in-progress record
        rec = await tx.idempotencyKey.create({
          data: {
            key: ctx.key,
            scope: ctx.scope,
            method: ctx.method,
            path: ctx.path,
            bodyHash,
            statusCode: 0,
            responseBody: Buffer.from(""),
            inProgress: true,
            expiresAt,
          },
        });
      }

      // Execute the handler once
      const result = await fn(); // should throw on failure you don't want cached

      // Persist response and mark finished
      await tx.idempotencyKey.update({
        where: { key_scope: { key: ctx.key, scope: ctx.scope } } as any,
        data: {
          statusCode: result.statusCode,
          responseBody: Buffer.from(JSON.stringify(result.body), "utf8"),
          inProgress: false,
        },
      });

      return result;
    }, { maxWait: 5000, timeout: 15000 });
  }

  /** Optional: purge expired keys */
  async purgeExpired(now = new Date()) {
    return this.prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } });
  }
}
