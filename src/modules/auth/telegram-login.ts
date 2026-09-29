import crypto from "node:crypto";
import { z } from "zod";
import { config } from "@/lib/config";
import { SESSION_MAX_AGE_SECONDS } from "@/modules/auth/telegram-cookie";
import {
  telegramUserSchema,
  type TelegramUser
} from "@/modules/auth/telegram";
import { AppError } from "@/shared/errors";

const IGNORED_WIDGET_KEYS = new Set(["hash", "next", "register"]);

const widgetUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  username: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  photo_url: z
    .string()
    .optional()
    .transform((value) => (value && value.startsWith("http") ? value : undefined)),
  auth_date: z.coerce.number().int().positive()
});

export type TelegramLoginWidgetInput = Record<string, unknown> | string;

function toFieldMap(input: TelegramLoginWidgetInput): Record<string, string> {
  if (typeof input === "string") {
    return Object.fromEntries(new URLSearchParams(input));
  }

  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === "") {
      continue;
    }
    map[key] = String(value);
  }
  return map;
}

function widgetDataCheckString(fields: Record<string, string>) {
  return Object.keys(fields)
    .filter((key) => !IGNORED_WIDGET_KEYS.has(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
}

function assertFreshAuthDate(authDate: number) {
  const ageSeconds = Date.now() / 1000 - authDate;
  if (
    !Number.isFinite(authDate) ||
    ageSeconds < 0 ||
    ageSeconds > SESSION_MAX_AGE_SECONDS
  ) {
    throw new AppError("UNAUTHORIZED", "Expired Telegram auth data", 401);
  }
}

/** Mini App initData has a nested `user` JSON field; Login Widget does not. */
export function isTelegramLoginWidgetPayload(raw: string): boolean {
  const params = new URLSearchParams(raw);
  return (
    params.has("id") &&
    params.has("auth_date") &&
    params.has("hash") &&
    !params.has("user")
  );
}

export function serializeTelegramLoginWidget(
  input: TelegramLoginWidgetInput
): string {
  const fields = toFieldMap(input);
  const params = new URLSearchParams();
  const keys = Object.keys(fields)
    .filter((key) => !IGNORED_WIDGET_KEYS.has(key))
    .sort((a, b) => a.localeCompare(b));

  for (const key of keys) {
    params.set(key, fields[key]);
  }
  params.set("hash", fields.hash ?? "");
  return params.toString();
}

/**
 * Login Widget HMAC: SHA256(bot_token) as secret.
 * This is NOT the Mini App WebAppData HMAC.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramLoginWidget(
  input: TelegramLoginWidgetInput,
  botToken = config.TELEGRAM_BOT_TOKEN
): TelegramUser {
  const fields = toFieldMap(input);
  const hash = fields.hash;

  if (!hash) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram hash", 401);
  }

  const dataCheckString = widgetDataCheckString(fields);
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const calculatedHashBuffer = Buffer.from(calculatedHash, "hex");

  if (
    hash.length !== calculatedHash.length ||
    hashBuffer.length !== calculatedHashBuffer.length ||
    !crypto.timingSafeEqual(calculatedHashBuffer, hashBuffer)
  ) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram signature", 401);
  }

  const parsed = widgetUserSchema.parse(fields);
  assertFreshAuthDate(parsed.auth_date);

  return telegramUserSchema.parse({
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username,
    photo_url: parsed.photo_url
  });
}
