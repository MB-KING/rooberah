-- Keep a person's own upload separate from the Telegram profile photo.
ALTER TABLE "User" ADD COLUMN "telegramPhotoUrl" TEXT;

-- Links that still point at Telegram are not a photo the person uploaded.
UPDATE "User"
SET "telegramPhotoUrl" = "photoUrl",
    "photoUrl" = NULL
WHERE "photoUrl" LIKE 'http%';
