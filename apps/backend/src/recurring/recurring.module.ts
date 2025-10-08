import { Module } from "@nestjs/common";
import { RecurringController } from "./recurring.controller.js";
import { PrismaService } from "../prisma.service.js";
import { GroupMemberGuard } from "../groups/members.guard.js";

@Module({
  controllers: [RecurringController],
  providers: [PrismaService, GroupMemberGuard],
})
export class RecurringModule {}
