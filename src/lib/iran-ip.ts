import { iranIpv4, iranIpv6 } from "@/lib/iran-cidrs";

const v4Blocks = iranIpv4
  .split("\n")
  .map((line) => parseV4(line.trim()))
  .filter((block): block is V4Block => block !== null);

const v6Blocks = iranIpv6
  .split("\n")
  .map((line) => parseV6(line.trim()))
  .filter((block): block is V6Block => block !== null);

type V4Block = { base: number; mask: number };
type V6Block = { base: bigint; mask: bigint };

function parseV4(cidr: string): V4Block | null {
  const [addr, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ip = ipv4ToInt(addr ?? "");
  if (ip === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { base: ip & mask, mask };
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function parseV6(cidr: string): V6Block | null {
  const [addr, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ip = ipv6ToBig(addr ?? "");
  if (ip === null || !Number.isInteger(bits) || bits < 0 || bits > 128) return null;
  const mask = bits === 0 ? 0n : ((1n << BigInt(bits)) - 1n) << BigInt(128 - bits);
  return { base: ip & mask, mask };
}

function ipv6ToBig(ip: string): bigint | null {
  const zone = ip.split("%")[0] ?? "";
  if (!zone.includes(":")) return null;
  const halves = zone.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right = halves[1] ? halves[1].split(":").filter(Boolean) : [];
  if (halves.length === 1 && left.length !== 8) return null;
  if (left.length + right.length > 8) return null;
  const groups = [
    ...left,
    ...Array(8 - left.length - right.length).fill("0"),
    ...right
  ];
  if (groups.length !== 8) return null;
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << 16n) + BigInt(parseInt(group, 16));
  }
  return value;
}

export function isIranIp(ip: string) {
  const trimmed = ip.trim().replace(/^::ffff:/i, "");
  const v4 = ipv4ToInt(trimmed);
  if (v4 !== null) {
    return v4Blocks.some((block) => (v4 & block.mask) === block.base);
  }
  const v6 = ipv6ToBig(trimmed);
  if (v6 === null) return false;
  return v6Blocks.some((block) => (v6 & block.mask) === block.base);
}

function isPublicIp(ip: string) {
  const value = ip.toLowerCase();
  if (
    value === "::1" ||
    value.startsWith("127.") ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    value.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  ) {
    return false;
  }
  return true;
}

/** Caddy appends the real client to X-Forwarded-For. The last public address is the visitor. */
export function clientIpFromHeaders(headerStore: Headers) {
  const forwarded =
    headerStore
      .get("x-forwarded-for")
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  const real = headerStore.get("x-real-ip")?.trim();
  const candidates = real ? [...forwarded, real] : forwarded;
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    if (isPublicIp(candidates[index])) return candidates[index];
  }
  return null;
}
