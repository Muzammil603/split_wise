import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service.js';
import { GroupsModule } from './groups/groups.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { SettlementsModule } from './settlements/settlements.module.js';
import { BalancesModule } from './balances/balances.module.js';
import { FilesModule } from './files/files.module.js';
import { FxModule } from './fx/fx.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { RecurringModule } from './recurring/recurring.module.js';
import { AuditModule } from './audit/audit.module.js';
import { PrivacyModule } from './privacy/privacy.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { scheduleRecurring } from './recurring/recurring.scheduler.js';
import { worker } from './recurring/recurring.worker.js';
import { notificationWorker } from './notifications/notifications.worker.js';
import { IdempotencyService } from './idempotency/idempotency.service.js';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor.js';
import { RedisService } from './redis/redis.service.js';
import { BalanceWriterService } from './balances/balance-writer.service.js';
import { join } from 'node:path';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    AuthModule,
    GroupsModule,
    ExpensesModule,
    SettlementsModule,
    BalancesModule,
    FilesModule,
        FxModule,
        NotificationsModule,
        RecurringModule,
        AuditModule,
        PrivacyModule,
        ActivityModule,
  ],
  providers: [
    PrismaService,
    RedisService,
    IdempotencyService,
    BalanceWriterService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Start the recurring expenses worker
    console.log('Starting recurring expenses worker...');
    
    // Schedule existing recurring expenses
    await scheduleRecurring(this.prisma);
    console.log('Recurring expenses scheduled');
    
    // Start the notifications worker
    console.log('Starting notifications worker...');
    console.log('Notifications worker started');
  }
}