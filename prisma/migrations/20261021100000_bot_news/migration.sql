ALTER TABLE "UserProfile" ADD COLUMN "notifyBotNews" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN "privateAnnounceAt" TIMESTAMP(3);
UPDATE "Event" SET "privateAnnounceAt" = NOW() WHERE status = 'PUBLISHED' AND "startTime" < NOW();
