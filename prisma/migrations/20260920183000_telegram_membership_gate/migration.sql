-- AlterTable
ALTER TABLE "Community" ADD COLUMN "requireTelegramMembership" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TelegramResource" ADD COLUMN "requiredForAccess" BOOLEAN NOT NULL DEFAULT true;
