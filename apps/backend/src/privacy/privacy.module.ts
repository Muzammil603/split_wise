import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller.js';
import { PrivacyService } from './privacy.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, PrismaService, AuditService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
