import { clientIpFromHeaders, describeIp } from "@/lib/iran-ip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  if (!ip) {
    return Response.json({ iran: false, ip: "", location: "" });
  }
  const geo = await describeIp(ip);
  return Response.json({ iran: geo.iran, ip, location: geo.location });
}
