import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, isIranIp } from "@/lib/iran-ip";

describe("isIranIp", () => {
  it("matches an Iranian IPv4 block", () => {
    expect(isIranIp("2.144.1.1")).toBe(true);
  });

  it("does not match a public foreign address", () => {
    expect(isIranIp("8.8.8.8")).toBe(false);
  });

  it("does not match a Dutch IPv6 address", () => {
    expect(isIranIp("2001:49f0:d13d:0:112c::1c")).toBe(false);
  });

  it("uses the last public address Caddy appended", () => {
    const headers = new Headers({
      "x-forwarded-for": "2.144.1.1, 88.198.1.1"
    });
    expect(clientIpFromHeaders(headers)).toBe("88.198.1.1");
    expect(isIranIp(clientIpFromHeaders(headers) ?? "")).toBe(false);
  });

  it("matches an Iranian IPv6 block", () => {
    expect(isIranIp("2001:790::1")).toBe(true);
  });
});
