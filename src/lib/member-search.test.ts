import { describe, expect, it } from "vitest";
import { memberSearchOr } from "@/lib/member-search";

describe("memberSearchOr", () => {
  it("is empty for blank query", () => {
    expect(memberSearchOr("   ")).toEqual([]);
  });

  it("matches a full name across first and last tokens", () => {
    const or = memberSearchOr("Sample Walker");
    const andClause = or.find((item) => item.AND);
    expect(andClause?.AND).toHaveLength(2);
  });

  it("matches a work-status label", () => {
    const or = memberSearchOr("جویای کار");
    expect(
      or.some(
        (item) =>
          item.profile &&
          "is" in item.profile &&
          item.profile.is &&
          "workStatus" in item.profile.is
      )
    ).toBe(true);
  });
});
