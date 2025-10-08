import { Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PrivacyService } from "./privacy.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { Response } from "express";

@UseGuards(JwtAuthGuard)
@Controller("me/privacy")
export class PrivacyController {
  constructor(
    private privacy: PrivacyService,
    private audit: AuditService
  ) {}

  @Get("export")
  async export(@Res() res: Response) {
    const userId = (res.req as any).user.userId as string;
    const data = await this.privacy.exportUser(userId);
    const filename = `export-${userId}-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
    
    // Log the export action
    await this.audit.log({
      actorUserId: userId,
      action: "privacy.export",
      targetType: "user",
      targetId: userId,
      meta: { 
        exportSize: JSON.stringify(data).length,
        groupsCount: data.memberships.length,
        expensesCount: data.expensesPaid.length 
      },
    });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(data, null, 2));
  }

  @Post("delete")
  async deleteAccount(@Res() res: Response) {
    const userId = (res.req as any).user.userId as string;
    const can = await this.privacy.canDelete(userId);
    if (!can.ok) {
      return res.status(409).json({
        error: "sole_owner",
        message: "Transfer ownership of these groups before deleting.",
        groups: can.blockingGroups
      });
    }
    
    const out = await this.privacy.deleteAndAnonymize(userId);
    
    // Log the deletion action
    await this.audit.log({
      actorUserId: userId,
      action: "privacy.delete",
      targetType: "user",
      targetId: userId,
      meta: { 
        deletedAt: out.deletedAt,
        anonymized: true 
      },
    });

    return res.status(200).json(out);
  }
}
