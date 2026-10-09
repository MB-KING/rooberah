-- Birthdays were stored as Tehran midnight, so the DATE column kept the previous UTC day.
UPDATE "UserProfile"
SET "birthDate" = "birthDate" + INTERVAL '1 day'
WHERE "birthDate" IS NOT NULL;
