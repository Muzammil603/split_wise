import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;
  
  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.client = new Redis(url, { 
      maxRetriesPerRequest: 3, 
      enableAutoPipelining: true 
    });
  }
  
  async onModuleDestroy() {
    await this.client.quit();
  }
}
