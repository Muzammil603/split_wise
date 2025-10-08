import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IdempotencyService } from "./idempotency.service.js";

@Injectable()
export class IdempotencyCron implements OnModuleInit {
  constructor(private idem: IdempotencyService) {}
  
  onModuleInit() { 
    // could trigger at boot too 
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purge() {
    await this.idem.purgeExpired();
  }
}
