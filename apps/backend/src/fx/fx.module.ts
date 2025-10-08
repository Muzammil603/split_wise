import { Module } from '@nestjs/common';
import { FxController } from './fx.controller.js';
import { FxService } from './fx.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [FxController],
  providers: [FxService, PrismaService],
  exports: [FxService],
})
export class FxModule {}
