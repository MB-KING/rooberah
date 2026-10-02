ALTER TABLE "Event" ADD COLUMN "announceThreadId" INTEGER;

CREATE TABLE "TelegramForumTopic" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "threadId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramForumTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramForumTopic_resourceId_threadId_key" ON "TelegramForumTopic"("resourceId", "threadId");
CREATE INDEX "TelegramForumTopic_resourceId_title_idx" ON "TelegramForumTopic"("resourceId", "title");

ALTER TABLE "TelegramForumTopic" ADD CONSTRAINT "TelegramForumTopic_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "TelegramResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TelegramForumTopic" ("id", "resourceId", "threadId", "title", "createdAt")
SELECT gen_random_uuid()::text, "id", "telegramThreadId", 'تاپیک ' || "telegramThreadId"::text, CURRENT_TIMESTAMP
FROM "TelegramResource"
WHERE "telegramThreadId" IS NOT NULL AND "type" = 'GROUP';
