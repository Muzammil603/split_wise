import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function main() {
  console.log("🔑 Generating JWT tokens for load test users...");

  const users = await prisma.user.findMany({
    where: { email: { contains: "+load@ex.com" } }
  });

  const tokens = [];
  
  for (const user of users) {
    // Update password hash to a known value
    const passwordHash = await argon2.hash("password123");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_ACCESS_SECRET || "dev_secret",
      { expiresIn: "1h" }
    );

    tokens.push(token);
    console.log(`✅ Generated token for ${user.name} (${user.email})`);
  }

  console.log("\n🔑 TOKENS for k6:");
  console.log(tokens.join(','));
  
  console.log("\n📋 Complete k6 environment variables:");
  console.log("BASE_URL=http://localhost:3000");
  console.log("GROUP_IDS=cmgi7wb1u000a211z737h3fap,cmgi7wbf1013d211ztsu2q0qo,cmgi7wbz402c1211zwy2nmdn2,cmgi7wcde03qa211zz0270qt1,cmgi7wct305a4211zha8l9wby");
  console.log("PAID_BY_IDS=cmgi7wb120000211zlfgz4u6s,cmgi7wb1a0001211zqjwc1fy5,cmgi7wb1c0002211z69wfoq02,cmgi7wb1f0003211ztnmcoif5,cmgi7wb1h0004211zimzcvo49,cmgi7wb1k0005211zjg7s80rp,cmgi7wb1m0006211zx2g66zd7,cmgi7wb1o0007211zrnxydw1c");
  console.log(`TOKENS=${tokens.join(',')}`);
}

main().finally(() => prisma.$disconnect());
