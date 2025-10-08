import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { equalSplit } from "@swp/shared/split";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
export const recurringQueue = new Queue("recurring", { connection });
const prisma = new PrismaClient();

export const worker = new Worker("recurring", async (job) => {
  const r = job.data as {
    groupId: string; 
    paidById: string; 
    amountCents: number; 
    currency: string; 
    note?: string; 
    beneficiaries?: string[];
  };
  
  const members = await prisma.groupMember.findMany({ where: { groupId: r.groupId }});
  const userIds = r.beneficiaries ?? members.map(m => m.userId);
  const splits = equalSplit({ totalCents: r.amountCents, userIds });
  
  await prisma.expense.create({
    data: {
      groupId: r.groupId, 
      paidById: r.paidById, 
      amountCents: r.amountCents, 
      currency: r.currency, 
      note: r.note ?? "Recurring",
      date: new Date(), 
      splits: { createMany: { data: splits }}
    }
  });
}, { connection });
