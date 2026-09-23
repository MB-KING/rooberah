import { refreshEventAnnouncementMessages } from "@/modules/events/announce.service";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.eventAnnouncement.findMany({
    where: {
      telegramMessageId: { not: null },
      event: { deletedAt: null }
    },
    select: { eventId: true },
    distinct: ["eventId"]
  });

  for (const row of rows) {
    await refreshEventAnnouncementMessages(row.eventId);
  }

  return NextResponse.json({ ok: true, events: rows.length });
}
