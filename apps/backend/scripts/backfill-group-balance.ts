import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling GroupBalance...");
  await prisma.groupBalance.deleteMany({}); // start clean (or skip if you want merge)
  const groups = await prisma.group.findMany({ select: { id: true } });

  for (const g of groups) {
    const members = await prisma.groupMember.findMany({ where: { groupId: g.id }, select: { userId: true } });
    const map = new Map<string, bigint>();
    // seed zeros
    for (const m of members) map.set(m.userId, 0n);

    // apply expenses
    const exps = await prisma.expense.findMany({ where: { groupId: g.id }, include: { splits: true } });
    for (const e of exps) {
      map.set(e.paidById, (map.get(e.paidById) ?? 0n) + BigInt(e.amountCents));
      for (const s of e.splits) {
        map.set(s.userId, (map.get(s.userId) ?? 0n) - BigInt(s.amountCents));
      }
    }

    // apply settlements
    const sets = await prisma.settlement.findMany({ where: { groupId: g.id } });
    for (const s of sets) {
      map.set(s.fromUserId, (map.get(s.fromUserId) ?? 0n) + BigInt(s.amountCents));
      map.set(s.toUserId,   (map.get(s.toUserId) ?? 0n) - BigInt(s.amountCents));
    }

    // write rows
    for (const [userId, bal] of map.entries()) {
      await prisma.groupBalance.upsert({
        where: { groupId_userId: { groupId: g.id, userId } },
        update: { balanceCents: bal },
        create: { groupId: g.id, userId, balanceCents: bal },
      });
    }
    console.log(`Backfilled ${g.id}`);
  }
  console.log("Done.");
}

main().finally(()=>prisma.$disconnect());
