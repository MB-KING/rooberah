import { Prisma, TelegramResourceType } from "@prisma/client";
import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { tehranDateInputValue } from "@/lib/tehran-time";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { birthdayGroupCopy } from "@/shared/notify-copy";
import { getDisplayName } from "@/shared/privacy";

function jalaliParts(iso: string) {
  const value = new DateObject({
    calendar: gregorian,
    format: "YYYY-MM-DD",
    date: iso
  }).convert(persian);
  return { year: value.year, month: value.month.number, day: value.day };
}

export async function postTodayBirthdays() {
  const today = jalaliParts(tehranDateInputValue(new Date()));
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const group = await prisma.telegramResource.findFirst({
    where: {
      type: TelegramResourceType.GROUP,
      isActive: true,
      telegramChatId: { not: null }
    },
    orderBy: [{ receiveAnnouncements: "desc" }, { sortOrder: "asc" }]
  });
  if (!group?.telegramChatId) return 0;

  const users = await prisma.user.findMany({
    where: { deletedAt: null, profile: { is: { birthDate: { not: null } } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      profile: { select: { birthDate: true } },
      attendance: {
        where: {
          status: "PRESENT",
          event: { deletedAt: null, date: { gte: yearAgo } }
        },
        select: { id: true }
      }
    }
  });

  let sent = 0;
  for (const user of users) {
    const iso = user.profile?.birthDate?.toISOString().slice(0, 10);
    if (!iso) continue;
    const parts = jalaliParts(iso);
    if (parts.month !== today.month || parts.day !== today.day) continue;

    try {
      await prisma.birthdayGreeting.create({
        data: { userId: user.id, jalaliYear: today.year }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }

    const result = await sendTelegramMessage({
      chatId: group.telegramChatId,
      text: birthdayGroupCopy(getDisplayName(user), user.attendance.length)
    });
    if (!result.ok) {
      await prisma.birthdayGreeting.delete({
        where: { userId_jalaliYear: { userId: user.id, jalaliYear: today.year } }
      });
      logger.warn("birthday_greeting_failed", { userId: user.id });
      continue;
    }
    sent += 1;
  }
  return sent;
}
