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
      // Use the SQL view to get balances (this is the primary source of truth)
      const balances = await this.prisma.$queryRaw<{ group_id: string; user_id: string; balance_cents: bigint }[]>
        `SELECT group_id, user_id, balance_cents FROM group_balances_view WHERE group_id = ${groupId} ORDER BY user_id`;

      // Get the user data for all user IDs
      const userIds = balances.map(b => b.user_id);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      });

      // Create a map for quick lookup
      const userMap = new Map(users.map(user => [user.id, user]));
      
      // Convert BigInt to number for JSON serialization and include user data
      const data = balances.map(row => ({
        groupId: row.group_id,
        userId: row.user_id,
        balanceCents: Number(row.balance_cents),
        user: userMap.get(row.user_id) || null // Include the user object
      }));
      
      console.log('🔍 Backend balances data:', JSON.stringify(data, null, 2));
      
      const json = JSON.stringify(data);
      await this.redis.client.setex(key, ttlSeconds, json);
      return data;
    } catch (error) {
      console.error('Balances query error:', error);
      throw error;
    }
  }
}
