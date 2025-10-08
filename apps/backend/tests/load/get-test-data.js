import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Extracting test data for k6...");

  // Get all load test groups
  const groups = await prisma.group.findMany({
    where: { name: { startsWith: "LoadGroup" } },
    include: { members: { include: { user: true } } }
  });

  console.log("\n📋 Test Data for k6:");
  console.log("\n🏷️  GROUP_IDS:");
  const groupIds = groups.map(g => g.id);
  console.log(groupIds.join(','));

  console.log("\n👥 PAID_BY_IDS:");
  const userIds = groups.flatMap(g => g.members.map(m => m.userId));
  const uniqueUserIds = [...new Set(userIds)];
  console.log(uniqueUserIds.join(','));

  console.log("\n🔑 TOKENS:");
  console.log("Note: You'll need to generate JWT tokens for these users");
  console.log("For testing, you can use the auth endpoints to get tokens");
  
  console.log("\n📊 Group Details:");
  groups.forEach((group, i) => {
    console.log(`Group ${i}: ${group.name} (${group.id})`);
    console.log(`  Members: ${group.members.length}`);
    console.log(`  Expenses: ${group._count?.expenses || 'N/A'}`);
  });

  console.log("\n💡 To get tokens, register/login with these emails:");
  const users = await prisma.user.findMany({
    where: { email: { contains: "+load@ex.com" } }
  });
  users.forEach(user => {
    console.log(`  ${user.email} (${user.name})`);
  });
}

main().finally(() => prisma.$disconnect());
