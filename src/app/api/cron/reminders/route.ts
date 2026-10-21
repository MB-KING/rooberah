import { processEventReminders } from "@/modules/events/reminder.service";
import { notifyUnsentUpcomingEvents } from "@/modules/telegram/bot-news";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processEventReminders();
  const announced = await notifyUnsentUpcomingEvents();
  return NextResponse.json({ ok: true, announced, ...result });
}
