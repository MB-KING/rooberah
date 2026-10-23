CREATE TABLE "BirthdayGreeting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jalaliYear" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BirthdayGreeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BirthdayGreeting_userId_jalaliYear_key" ON "BirthdayGreeting"("userId", "jalaliYear");

ALTER TABLE "BirthdayGreeting" ADD CONSTRAINT "BirthdayGreeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
