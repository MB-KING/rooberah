import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isTelegramLoginWidgetPayload,
  serializeTelegramLoginWidget,
  validateTelegramLoginWidget
} from "@/modules/auth/telegram-login";
import { validateTelegramInitData } from "@/modules/auth/telegram";

const FIXTURE_BOT_TOKEN = "123456:ABC-test-token-not-for-production";

function signedWidgetFields(
  botToken: string,
  overrides: Record<string, string> = {},
  authDate = Math.floor(Date.now() / 1000)
) {
  const fields: Record<string, string> = {
    id: "42",
    first_name: "Ham",
    username: "walker",
    auth_date: `${authDate}`,
    ...overrides
  };

  const dataCheckString = Object.keys(fields)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  fields.hash = hash;
  return fields;
}

function signedInitData(botToken: string) {
  const params = new URLSearchParams({
    auth_date: `${Math.floor(Date.now() / 1000)}`,
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: 42, first_name: "Ham", username: "walker" })
  });
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateTelegramLoginWidget", () => {
  it("accepts correctly signed Login Widget data", () => {
    const user = validateTelegramLoginWidget(
      signedWidgetFields(FIXTURE_BOT_TOKEN),
      FIXTURE_BOT_TOKEN
    );
    expect(user.id).toBe(42);
    expect(user.first_name).toBe("Ham");
    expect(user.username).toBe("walker");
  });

  it("accepts a query-string payload the same way as an object", () => {
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN);
    const query = new URLSearchParams(fields).toString();
    const user = validateTelegramLoginWidget(query, FIXTURE_BOT_TOKEN);
    expect(user.id).toBe(42);
  });

  it("rejects tampered widget data", () => {
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN);
    fields.first_name = "Intruder";
    expect(() =>
      validateTelegramLoginWidget(fields, FIXTURE_BOT_TOKEN)
    ).toThrow("Invalid Telegram signature");
  });

  it("rejects Mini App WebAppData HMAC as a widget signature", () => {
    const fields: Record<string, string> = {
      id: "42",
      first_name: "Ham",
      auth_date: `${Math.floor(Date.now() / 1000)}`
    };
    const dataCheckString = Object.keys(fields)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => `${key}=${fields[key]}`)
      .join("\n");
    const webAppSecret = crypto
      .createHmac("sha256", "WebAppData")
      .update(FIXTURE_BOT_TOKEN)
      .digest();
    fields.hash = crypto
      .createHmac("sha256", webAppSecret)
      .update(dataCheckString)
      .digest("hex");

    expect(() =>
      validateTelegramLoginWidget(fields, FIXTURE_BOT_TOKEN)
    ).toThrow("Invalid Telegram signature");
  });

  it("does not accept Mini App initData", () => {
    const initData = signedInitData(FIXTURE_BOT_TOKEN);
    expect(isTelegramLoginWidgetPayload(initData)).toBe(false);
    expect(() => validateTelegramInitData(initData, FIXTURE_BOT_TOKEN)).not.toThrow();
    expect(() =>
      validateTelegramLoginWidget(initData, FIXTURE_BOT_TOKEN)
    ).toThrow();
  });

  it("rejects expired auth_date", () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60;
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN, {}, twoDaysAgo);
    expect(() =>
      validateTelegramLoginWidget(fields, FIXTURE_BOT_TOKEN)
    ).toThrow("Expired Telegram auth data");
  });

  it("rejects auth dates from the future", () => {
    const future = Math.floor(Date.now() / 1000) + 60;
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN, {}, future);
    expect(() =>
      validateTelegramLoginWidget(fields, FIXTURE_BOT_TOKEN)
    ).toThrow("Expired Telegram auth data");
  });

  it("ignores next and register when verifying the widget hash", () => {
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN);
    const query = new URLSearchParams({
      ...fields,
      next: "/events/abc?register=1",
      register: "1"
    }).toString();
    const user = validateTelegramLoginWidget(query, FIXTURE_BOT_TOKEN);
    expect(user.id).toBe(42);
  });

  it("round-trips optional widget fields through cookie serialization", () => {
    const fields = signedWidgetFields(FIXTURE_BOT_TOKEN, {
      last_name: "Masir",
      photo_url: "https://t.me/i/userpic/320/example.jpg"
    });
    const serialized = serializeTelegramLoginWidget(fields);
    const user = validateTelegramLoginWidget(serialized, FIXTURE_BOT_TOKEN);
    expect(user.last_name).toBe("Masir");
    expect(user.photo_url).toBe("https://t.me/i/userpic/320/example.jpg");
  });
});
