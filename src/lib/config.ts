import { z } from "zod";

const isVitest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1)
    .refine((value) => {
      if (isVitest || process.env.NODE_ENV === "development") {
        return true;
      }
      return (
        value !== "development-token" &&
        value !== "replace-with-your-telegram-bot-token" &&
        value !== "local-dev-telegram-token"
      );
    }, "TELEGRAM_BOT_TOKEN must be set to a real bot token"),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_OIDC_CLIENT_ID: z.string().optional(),
  TELEGRAM_OIDC_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ALLOW_DEV_AUTH: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  TELEGRAM_STORAGE_CHAT_ID: z.string().optional()
});

export const config = envSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    (isVitest ? "mysql://test:test@localhost:3306/test" : undefined),
  TELEGRAM_BOT_TOKEN:
    process.env.TELEGRAM_BOT_TOKEN ??
    (isVitest ? "test-bot-token-not-for-production" : undefined),
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_OIDC_CLIENT_ID: process.env.TELEGRAM_OIDC_CLIENT_ID,
  TELEGRAM_OIDC_CLIENT_SECRET: process.env.TELEGRAM_OIDC_CLIENT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  APP_URL: process.env.APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
  TELEGRAM_STORAGE_CHAT_ID: process.env.TELEGRAM_STORAGE_CHAT_ID
});

export const defaultCommunitySlug = "rooberah";
