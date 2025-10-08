import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { MeController } from './me.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { AuditService } from '../audit/audit.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, MeController],
  providers: [AuthService, PrismaService, JwtStrategy, AuditService],
  exports: [JwtModule],
})
export class AuthModule {}