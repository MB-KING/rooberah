import { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  sendTelegramChoices,
  sendTelegramMessage
} from "@/lib/telegram-bot";
import { escapeHtml } from "@/lib/telegram-format";
import { RegistrationService } from "@/modules/registrations/registration.service";

const CANCEL_PREFIX = "cancel:";

export function cancelCallbackData(eventId: string) {
  return `${CANCEL_PREFIX}${eventId}`;
}

export function eventIdFromCancelCallback(data: string) {
  if (!data.startsWith(CANCEL_PREFIX)) return null;
  const eventId = data.slice(CANCEL_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(eventId) ? eventId : null;
}

export async function sendCancelRegistrationMenu(telegramUserId: number, chatId: number) {
  const user = await prisma.user.findFirst({
    where: { telegramId: BigInt(telegramUserId), deletedAt: null },
    select: { id: true }
  });
  if (!user) {
    await sendTelegramMessage({
      chatId,
      text: "اول از داخل برنامه وارد شو، بعد ثبت‌نام را لغو کن.",
      parseMode: "HTML"
    });
    return;
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: {
      userId: user.id,
      status: RegistrationStatus.REGISTERED,
      event: {
        deletedAt: null,
        status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
        meetingTime: { gte: new Date() }
      }
    },
    orderBy: { event: { meetingTime: "asc" } },
    take: 8,
    select: {
      event: { select: { id: true, title: true, eventNumber: true } }
    }
  });

  if (registrations.length === 0) {
    await sendTelegramMessage({
      chatId,
      text: "ثبت‌نام قطعیِ آینده‌ای نداری که لغو شود.",
      parseMode: "HTML"
    });
    return;
  }

  await sendTelegramChoices({
    chatId,
    text: "کدام ثبت‌نام لغو شود؟",
    choices: registrations.map((row) => ({
      text: `لغو ${row.event.eventNumber} · ${row.event.title}`.slice(0, 60),
      data: cancelCallbackData(row.event.id)
    }))
  });
}

export async function handleCancelRegistrationCallback(input: {
  callbackQueryId: string;
  data: string;
  telegramUserId: number;
  chatId: number;
}) {
  const eventId = eventIdFromCancelCallback(input.data);
  if (!eventId) return false;

  const user = await prisma.user.findFirst({
    where: { telegramId: BigInt(input.telegramUserId), deletedAt: null },
    select: { id: true }
  });
  if (!user) {
    await answerCallbackQuery({
      callbackQueryId: input.callbackQueryId,
      text: "اول وارد برنامه شو."
    });
    return true;
  }

  try {
    await new RegistrationService().cancel(user.id, eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true }
    });
    await answerCallbackQuery({
      callbackQueryId: input.callbackQueryId,
      text: "ثبت‌نام لغو شد."
    });
    await sendTelegramMessage({
      chatId: input.chatId,
      text: `ثبت‌نامت برای ${escapeHtml(event?.title ?? "برنامه")} لغو شد.`,
      parseMode: "HTML",
      eventPath: `/events/${eventId}`,
      openApp: true
    });
  } catch (error) {
    await answerCallbackQuery({
      callbackQueryId: input.callbackQueryId,
      text: "لغو ثبت‌نام انجام نشد."
    });
    await sendTelegramMessage({
      chatId: input.chatId,
      text:
        error instanceof Error && error.message
          ? "این ثبت‌نام را نمی‌شود لغو کرد."
          : "لغو ثبت‌نام انجام نشد.",
      parseMode: "HTML"
    });
  }
  return true;
}
