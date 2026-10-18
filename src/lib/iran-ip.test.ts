import { describe, expect, it } from "vitest";
import { isIranIp } from "@/lib/iran-ip";

describe("isIranIp", () => {
  it("matches an Iranian IPv4 block", () => {
    expect(isIranIp("2.144.1.1")).toBe(true);
  });

  it("does not match a public foreign address", () => {
    expect(isIranIp("8.8.8.8")).toBe(false);
  });

  it("matches an Iranian IPv6 block", () => {
    expect(isIranIp("2001:790::1")).toBe(true);
  });
});
