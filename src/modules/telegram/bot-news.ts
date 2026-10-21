import { EventStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { formatNotificationHtml } from "@/lib/telegram-format";
import { notifyButtons } from "@/shared/notify-copy";

const faDate = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  month: "long",
  day: "numeric"
});
const faTime = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit"
});

export async function sendBotNews(input: {
  communityId: string;
  type: string;
  title: string;
  body: string;
  eventPath?: string;
  buttonText?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      communityId: input.communityId,
      deletedAt: null,
      telegramId: { gt: 0 },
      OR: [{ profile: null }, { profile: { is: { notifyBotNews: true } } }]
    },
    select: { id: true, telegramId: true }
  });
  if (users.length === 0) return { sent: 0, failed: 0, total: 0 };

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: input.type,
      title: input.title,
      body: input.body
    }))
  });

  const text = formatNotificationHtml(input.title, input.body);
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const result = await sendTelegramMessage({
      chatId: user.telegramId,
      text,
      parseMode: "HTML",
      openApp: true,
      eventPath: input.eventPath,
      buttonText: input.buttonText
    });
    if (result.ok) sent += 1;
    else failed += 1;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return { sent, failed, total: users.length };
}

export async function notifyMembersAboutEvent(event: {
  id: string;
  communityId: string;
  title: string;
  eventNumber: number;
  date: Date;
  startTime: Date;
  locationName: string;
  status: EventStatus;
}) {
  if (event.status !== EventStatus.PUBLISHED) return;
  const claimed = await prisma.event.updateMany({
    where: { id: event.id, privateAnnounceAt: null, status: EventStatus.PUBLISHED },
    data: { privateAnnounceAt: new Date() }
  });
  if (claimed.count === 0) return;

  const result = await sendBotNews({
    communityId: event.communityId,
    type: "EVENT_PUBLISHED",
    title: `برنامه ${event.eventNumber}`,
    body: [
      event.title,
      faDate.format(event.date),
      `شروع ${faTime.format(event.startTime)}`,
      event.locationName
    ].join("\n"),
    eventPath: `/events/${event.id}`,
    buttonText: notifyButtons.signup
  });
  logger.info("event_private_announce", { eventId: event.id, ...result });
}

export async function notifyUnsentUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: EventStatus.PUBLISHED,
      privateAnnounceAt: null,
      startTime: { gte: new Date() }
    },
    select: {
      id: true,
      communityId: true,
      title: true,
      eventNumber: true,
      date: true,
      startTime: true,
      locationName: true,
      status: true
    }
  });
  for (const event of events) {
    await notifyMembersAboutEvent(event);
  }
  return events.length;
}
