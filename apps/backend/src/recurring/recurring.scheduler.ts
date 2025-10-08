import { PrismaService } from "../prisma.service.js";
import { recurringQueue } from "./recurring.worker.js";

export async function scheduleRecurring(prisma: PrismaService) {
  const rows = await prisma.recurringExpense.findMany({ where: { active: true }});
  await Promise.all(rows.map(r => recurringQueue.add(
    `rec-${r.id}`, 
    { 
      groupId: r.groupId, 
      paidById: r.paidById, 
      amountCents: r.amountCents, 
      currency: r.currency, 
      note: r.note,
      beneficiaries: r.beneficiaries as string[] | undefined
    },
    { 
      repeat: { pattern: r.cron }, 
      removeOnComplete: 10, 
      removeOnFail: 10 
    }
  )));
}
