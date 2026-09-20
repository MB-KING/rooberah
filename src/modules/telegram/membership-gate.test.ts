import { describe, expect, it } from "vitest";
import { TelegramMembershipStatus } from "@prisma/client";
import {
  isActiveMembershipStatus,
  mapTelegramApiStatus
} from "@/modules/telegram/membership-gate";

describe("telegram membership status", () => {
  it("treats members, admins, creators, and restricted users as present", () => {
    expect(mapTelegramApiStatus("member")).toBe(TelegramMembershipStatus.MEMBER);
    expect(mapTelegramApiStatus("restricted")).toBe(
      TelegramMembershipStatus.MEMBER
    );
    expect(mapTelegramApiStatus("administrator")).toBe(
      TelegramMembershipStatus.ADMIN
    );
    expect(mapTelegramApiStatus("creator")).toBe(
      TelegramMembershipStatus.CREATOR
    );
    expect(isActiveMembershipStatus(TelegramMembershipStatus.MEMBER)).toBe(true);
    expect(isActiveMembershipStatus(TelegramMembershipStatus.ADMIN)).toBe(true);
    expect(isActiveMembershipStatus(TelegramMembershipStatus.CREATOR)).toBe(
      true
    );
  });

  it("rejects left and kicked users", () => {
    expect(mapTelegramApiStatus("left")).toBe(TelegramMembershipStatus.LEFT);
    expect(mapTelegramApiStatus("kicked")).toBe(TelegramMembershipStatus.KICKED);
    expect(isActiveMembershipStatus(TelegramMembershipStatus.LEFT)).toBe(false);
    expect(isActiveMembershipStatus(TelegramMembershipStatus.KICKED)).toBe(
      false
    );
    expect(isActiveMembershipStatus(TelegramMembershipStatus.UNKNOWN)).toBe(
      false
    );
  });
});
