-- CreateTable
CREATE TABLE "GroupBalance" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCents" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBalance_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateIndex
CREATE INDEX "GroupBalance_groupId_idx" ON "GroupBalance"("groupId");
