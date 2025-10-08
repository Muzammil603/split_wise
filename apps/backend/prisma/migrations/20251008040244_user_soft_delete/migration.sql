-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonAvatarUrl" TEXT,
ADD COLUMN     "anonName" TEXT,
ADD COLUMN     "anonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
