import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service.js';
import { GroupsModule } from './groups/groups.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { SettlementsModule } from './settlements/settlements.module.js';
import { BalancesModule } from './balances/balances.module.js';
import { FilesModule } from './files/files.module.js';
import { join } from 'node:path';
import { APP_GUARD } from '@nestjs/core';

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
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}