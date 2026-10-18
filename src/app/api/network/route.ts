import { clientIpFromHeaders, isIranIp } from "@/lib/iran-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const iran = Boolean(ip && isIranIp(ip));
  return Response.json({
    iran,
    ip: ip ?? "",
    location: iran ? "ایران" : ""
  });
}
