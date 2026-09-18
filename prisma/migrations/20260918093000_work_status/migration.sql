-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('HIRING', 'OPEN_TO_WORK', 'OPEN_TO_TEAM', 'FREELANCE', 'NOT_AVAILABLE');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "workStatus" "WorkStatus",
ADD COLUMN "showWorkStatus" BOOLEAN NOT NULL DEFAULT true;
