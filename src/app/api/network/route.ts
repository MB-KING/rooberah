import { clientIpFromHeaders, isIranIp } from "@/lib/iran-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  return Response.json({ iran: ip ? isIranIp(ip) : false, ip: ip ?? "" });
}
