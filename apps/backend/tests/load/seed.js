import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function cents(n) { return Math.round(n * 100); }

async function main() {
  console.log("🌱 Starting load test data seeding...");

  // Create users
  const users = [];
  for (const name of ["Alice","Bob","Cara","Dev","Eve","Finn","Gus","Hana","Ivan","Jill"]) {
    const email = `${name.toLowerCase()}+load@ex.com`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: "!" },
    });
    users.push(u);
    console.log(`✅ Created user: ${name} (${u.id})`);
  }

  // Create 5 groups with 5–8 members each
  for (let g = 0; g < 5; g++) {
    const owner = users[g];
    const group = await prisma.group.create({
      data: { 
        name: `LoadGroup-${g}`, 
        currency: "USD", 
        createdBy: owner.id,
        members: { 
          create: users.slice(0, 5 + (g % 4)).map((u, i) => ({ 
            userId: u.id, 
            role: i === 0 ? "owner" : "member" 
          })) 
        } 
      }
    });
    console.log(`✅ Created group: ${group.name} (${group.id}) with ${5 + (g % 4)} members`);

    // Seed 200 historical expenses per group
    for (let i = 0; i < 200; i++) {
      const payer = users[(i + g) % users.length];
      const total = cents(10 + Math.random() * 90);
      const memberIds = (await prisma.groupMember.findMany({ where: { groupId: group.id } })).map(m => m.userId);
      
      // equal split
      const base = Math.floor(total / memberIds.length);
      let r = total % memberIds.length;
      const splits = memberIds.map((uid, idx) => ({ 
        userId: uid, 
        amountCents: base + (idx < r ? 1 : 0) 
      }));
      
      await prisma.expense.create({
        data: {
          groupId: group.id, 
          paidById: payer.id, 
          amountCents: total, 
          currency: "USD",
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * (200 - i)),
          note: `seed-${i}-${crypto.randomBytes(2).toString("hex")}`,
          splits: { createMany: { data: splits } },
        }
      });

      if (i % 50 === 0) {
        console.log(`  📊 Seeded ${i + 1}/200 expenses for ${group.name}`);
      }
    }
  }

  console.log("🎉 Load test data seeding complete!");
  console.log("\n📋 Summary:");
  console.log(`- Users: ${users.length}`);
  console.log(`- Groups: 5`);
  console.log(`- Total expenses: 1000 (200 per group)`);
  console.log("\n🔑 Test data ready for k6 load testing!");
}

main().finally(() => prisma.$disconnect());
