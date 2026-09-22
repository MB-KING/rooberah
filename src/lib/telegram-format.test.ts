import { afterEach, describe, expect, it } from "vitest";
import {
  pathFromStartParam,
  startParamFromPath,
  telegramDeepLink
} from "@/lib/telegram-format";

const originalShort = process.env.TELEGRAM_MINI_APP_SHORT_NAME;
const originalUser = process.env.TELEGRAM_BOT_USERNAME;

afterEach(() => {
  if (originalShort == null) {
    delete process.env.TELEGRAM_MINI_APP_SHORT_NAME;
  } else {
    process.env.TELEGRAM_MINI_APP_SHORT_NAME = originalShort;
  }
  if (originalUser == null) {
    delete process.env.TELEGRAM_BOT_USERNAME;
  } else {
    process.env.TELEGRAM_BOT_USERNAME = originalUser;
  }
});

describe("telegramDeepLink", () => {
  it("opens the bot with /start so group buttons do not need a Main Mini App", () => {
    process.env.TELEGRAM_BOT_USERNAME = "rooberahirbot";
    delete process.env.TELEGRAM_MINI_APP_SHORT_NAME;
    expect(telegramDeepLink("/events/11111111-1111-4111-8111-111111111111")).toBe(
      "https://t.me/rooberahirbot?start=e_11111111-1111-4111-8111-111111111111"
    );
  });

  it("uses the named Mini App path when a short name is configured", () => {
    process.env.TELEGRAM_BOT_USERNAME = "rooberahirbot";
    process.env.TELEGRAM_MINI_APP_SHORT_NAME = "app";
    expect(telegramDeepLink("/events/11111111-1111-4111-8111-111111111111")).toBe(
      "https://t.me/rooberahirbot/app?startapp=e_11111111-1111-4111-8111-111111111111"
    );
  });

  it("round-trips event start params", () => {
    const path = "/events/11111111-1111-4111-8111-111111111111";
    expect(pathFromStartParam(startParamFromPath(path))).toBe(path);
  });
});
