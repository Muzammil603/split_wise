import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GroupMemberGuard } from '../groups/members.guard.js';
import { RedisService } from '../redis/redis.service.js';
import { cacheKey, nearExpiry } from '../common/cache.util.js';

@UseGuards(JwtAuthGuard, GroupMemberGuard)
@Controller('groups/:groupId/balances')
export class BalancesController {
  constructor(private prisma: PrismaService, private redis: RedisService) {}
  
  @Get()
  async list(@Param('groupId') groupId: string) {
    const key = cacheKey.balances(groupId);
    const ttlSeconds = 3; // small but effective
    const client = this.redis.client;

    // Try cache first (with TTL check for SWR)
    const pip = client.multi();
    pip.get(key);
    pip.ttl(key);
    const [cached, ttlLeft] = (await pip.exec())!.map((x: any) => x[1]) as [string|null, number];

    if (cached) {
      console.log(`[cache] balances hit ${groupId}`);
      const data = JSON.parse(cached);
      // Stale-while-revalidate: refresh in background if near expiry
      if (nearExpiry(ttlLeft)) {
        this.recomputeAndSet(groupId, key, ttlSeconds).catch(() => void 0);
      }
      return data;
    }

    console.log(`[cache] balances miss ${groupId}`);
    // Miss → compute and cache
    return await this.recomputeAndSet(groupId, key, ttlSeconds);
  }

  private async recomputeAndSet(groupId: string, key: string, ttlSeconds: number) {
    try {
      const result = await this.prisma.groupBalance.findMany({
        where: { groupId },
        select: { groupId: true, userId: true, balanceCents: true, updatedAt: true },
        orderBy: { userId: "asc" },
      });
      
      // Convert BigInt to number for JSON serialization and match old format
      const data = result.map(row => ({
        group_id: row.groupId,
        user_id: row.userId,
        balance_cents: Number(row.balanceCents)
      }));
      
      const json = JSON.stringify(data);
      await this.redis.client.setex(key, ttlSeconds, json);
      return data;
    } catch (error) {
      console.error('Balances query error:', error);
      throw error;
    }
  }
}
