import { describe, expect, it } from "vitest";
import { XPTransactionType } from "@prisma/client";
import { xpRules } from "@/modules/gamification/xp.service";

describe("xpRules", () => {
  it("awards XP for verified attendance only through the central rule table", () => {
    expect(xpRules[XPTransactionType.ATTEND_EVENT]).toBe(100);
  });

  it("keeps photos as a small bonus next to attendance", () => {
    expect(xpRules[XPTransactionType.EVENT_PHOTO]).toBe(10);
    expect(xpRules[XPTransactionType.REFER_USER]).toBe(20);
    expect(xpRules[XPTransactionType.CREATE_REWARD]).toBe(30);
    expect(
      (xpRules[XPTransactionType.EVENT_PHOTO] ?? 0) * 2
    ).toBeLessThan(xpRules[XPTransactionType.ATTEND_EVENT]);
  });
});
