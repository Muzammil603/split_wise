import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { MeController } from './me.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { AuditService } from '../audit/audit.service.js';
import { PrivacyService } from '../privacy/privacy.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, PrismaService, JwtStrategy, AuditService, PrivacyService],
  exports: [JwtModule],
})
export class AuthModule {}