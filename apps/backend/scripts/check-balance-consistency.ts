import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.group.findMany({ select: { id: true } });
  let ok = true;

  for (const g of groups) {
    // compute from raw
    const map = new Map<string, bigint>();
    const members = await prisma.groupMember.findMany({ where: { groupId: g.id } });
    members.forEach(m => map.set(m.userId, 0n));

    const exps = await prisma.expense.findMany({ where: { groupId: g.id }, include: { splits: true } });
    for (const e of exps) {
      map.set(e.paidById, (map.get(e.paidById) ?? 0n) + BigInt(e.amountCents));
      for (const s of e.splits) map.set(s.userId, (map.get(s.userId) ?? 0n) - BigInt(s.amountCents));
    }

    const sets = await prisma.settlement.findMany({ where: { groupId: g.id } });
    for (const s of sets) {
      map.set(s.fromUserId, (map.get(s.fromUserId) ?? 0n) + BigInt(s.amountCents));
      map.set(s.toUserId,   (map.get(s.toUserId) ?? 0n) - BigInt(s.amountCents));
    }

    const proj = await prisma.groupBalance.findMany({ where: { groupId: g.id } });
    const projMap = new Map(proj.map(p => [p.userId, BigInt(p.balanceCents as any)]));

    for (const m of members) {
      const a = map.get(m.userId) ?? 0n;
      const b = projMap.get(m.userId) ?? 0n;
      if (a !== b) {
        ok = false;
        console.error(`Mismatch group ${g.id} user ${m.userId}: raw=${a} proj=${b}`);
      }
    }
  }

  if (ok) console.log("All balances consistent ✅");
  else process.exit(1);
}

main().finally(()=>prisma.$disconnect());
