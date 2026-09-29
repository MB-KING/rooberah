import { describe, expect, it } from "vitest";
import {
  cancelCallbackData,
  eventIdFromCancelCallback
} from "@/modules/telegram/cancel-registration";

const eventId = "11111111-1111-4111-8111-111111111111";

describe("cancel registration callback", () => {
  it("round-trips an event id inside the telegram callback limit", () => {
    const data = cancelCallbackData(eventId);
    expect(data.length).toBeLessThanOrEqual(64);
    expect(eventIdFromCancelCallback(data)).toBe(eventId);
  });

  it("ignores other callback payloads", () => {
    expect(eventIdFromCancelCallback("home")).toBeNull();
    expect(eventIdFromCancelCallback("cancel:not-a-uuid")).toBeNull();
  });
});
