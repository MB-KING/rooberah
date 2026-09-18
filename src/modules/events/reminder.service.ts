import { EventReminderKind, EventStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { notifyUser } from "@/modules/activity/activity.service";
import {
  eventDayReminderCopy,
  eventTwoHourReminderCopy
} from "@/shared/notify-copy";

const tehranDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const tehranHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  hour12: false
});

const faDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  month: "long",
  day: "numeric"
});

const faTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit"
});

function tehranDateKey(date: Date) {
  return tehranDateFormatter.format(date);
}

function tehranHour(date: Date) {
  return Number(tehranHourFormatter.format(date));
}

export async function processEventReminders(now = new Date()) {
  const dayKey = tehranDateKey(now);
  const hour = tehranHour(now);

  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: { in: [EventStatus.PUBLISHED, EventStatus.REGISTRATION_CLOSED] },
      meetingTime: {
        gte: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 26 * 60 * 60 * 1000)
      }
    },
    include: {
      registrations: {
        where: { status: RegistrationStatus.REGISTERED },
        select: { userId: true }
      }
    }
  });

  let dayOfSent = 0;
  let twoHoursSent = 0;

  for (const event of events) {
    const userIds = event.registrations.map((item) => item.userId);
    if (userIds.length === 0) {
      continue;
    }

    const isDayOf = tehranDateKey(event.date) === dayKey;
    const msUntilMeeting = event.meetingTime.getTime() - now.getTime();
    const isTwoHoursWindow =
      msUntilMeeting <= 2.25 * 60 * 60 * 1000 &&
      msUntilMeeting > 1 * 60 * 60 * 1000;

    // Morning/day reminder (VPS cron, Tehran daytime window).
    if (isDayOf && hour >= 6 && hour <= 22) {
      dayOfSent += await sendKindReminders({
        eventId: event.id,
        userIds,
        kind: EventReminderKind.DAY_OF,
        ...eventDayReminderCopy({
          title: event.title,
          meetingTimeLabel: faTimeFormatter.format(event.meetingTime),
          locationName: event.locationName
        }),
        eventPath: `/events/${event.id}`
      });
    }

    if (isTwoHoursWindow) {
      twoHoursSent += await sendKindReminders({
        eventId: event.id,
        userIds,
        kind: EventReminderKind.TWO_HOURS_BEFORE,
        ...eventTwoHourReminderCopy({
          title: event.title,
          dateLabel: faDateFormatter.format(event.date),
          meetingTimeLabel: faTimeFormatter.format(event.meetingTime),
          locationName: event.locationName
        }),
        eventPath: `/events/${event.id}`
      });
    }
  }

  logger.info("event_reminders_processed", {
    events: events.length,
    dayOfSent,
    twoHoursSent
  });

  return { events: events.length, dayOfSent, twoHoursSent };
}

async function sendKindReminders(input: {
  eventId: string;
  userIds: string[];
  kind: EventReminderKind;
  title: string;
  body: string;
  buttonText: string;
  eventPath: string;
}) {
  let sent = 0;

  for (const userId of input.userIds) {
    const already = await prisma.eventReminder.findUnique({
      where: {
        eventId_userId_kind: {
          eventId: input.eventId,
          userId,
          kind: input.kind
        }
      },
      select: { id: true }
    });
    if (already) continue;

    const { telegramDelivered } = await notifyUser({
      userId,
      type: `EVENT_REMINDER_${input.kind}`,
      title: input.title,
      body: input.body,
      eventPath: input.eventPath,
      buttonText: input.buttonText
    });

    // Only lock the reminder after a successful Telegram delivery so
    // blocked/never-started users can be retried on the next cron tick.
    if (!telegramDelivered) continue;

    try {
      await prisma.eventReminder.create({
        data: {
          eventId: input.eventId,
          userId,
          kind: input.kind
        }
      });
      sent += 1;
    } catch {
      // Race: another worker recorded the same reminder.
    }
  }

  return sent;
}
