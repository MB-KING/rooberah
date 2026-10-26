import { randomBytes } from "node:crypto";
import { EventStatus, ModerationStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  answerTelegramCallback,
  downloadTelegramFile,
  editTelegramMessage,
  sendTelegramMessage
} from "@/lib/telegram-bot";
import { escapeHtml } from "@/lib/telegram-format";
import { EventPhotoService } from "@/modules/events/event-photo.service";
import { AppError } from "@/shared/errors";
import { APP_NAME } from "@/shared/brand";
import { getDisplayName } from "@/shared/privacy";

type Person = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
};

type Chat = {
  id: number;
  type?: string;
  title?: string;
  username?: string;
};

type PendingPhoto = {
  fileId: string;
  caption?: string;
  person: Person;
  expires: number;
};

const pendingPhotos = new Map<string, PendingPhoto>();

function rememberPhoto(photo: Omit<PendingPhoto, "expires">) {
  const id = randomBytes(4).toString("hex");
  pendingPhotos.set(id, { ...photo, expires: Date.now() + 30 * 60 * 1000 });
  return id;
}

function takePhoto(id: string) {
  const photo = pendingPhotos.get(id);
  if (!photo || photo.expires < Date.now()) {
    pendingPhotos.delete(id);
    return null;
  }
  return photo;
}

function buttonLabel(title: string) {
  const chars = Array.from(title.trim());
  if (chars.length <= 40) return chars.join("");
  return `${chars.slice(0, 39).join("")}…`;
}

function commandToken(text: string) {
  return text.trim().split(/\s+/)[0]?.replace(/@\w+$/i, "").toLowerCase() ?? "";
}

async function findEventAdmin(telegramId: number) {
  return prisma.user.findFirst({
    where: {
      telegramId: BigInt(telegramId),
      deletedAt: null,
      roles: { some: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } } }
    }
  });
}

function photoError(error: unknown) {
  if (!(error instanceof AppError)) return "عکس به برنامه اضافه نشد.";
  if (error.code === "PHOTO_LIMIT_REACHED") {
    return "برای این برنامه به سقف عکس رسیده.";
  }
  if (error.message === "Attendance required") {
    return "اول حضورش را برای این برنامه ثبت کن.";
  }
  if (error.message === "Event not completed") {
    return "اول وضعیت برنامه را برگزارشده کن.";
  }
  return "عکس به برنامه اضافه نشد.";
}

export async function handleReplyPhotoCommand(input: {
  text: string;
  chat: Chat;
  threadId?: number;
  messageId?: number;
  from?: Person;
  replyTo?: Person;
  fileId?: string;
  caption?: string;
}) {
  if (commandToken(input.text) !== "/photo") return false;

  const reply = (text: string) =>
    sendTelegramMessage({
      chatId: input.chat.id,
      text,
      parseMode: "HTML",
      threadId: input.threadId,
      replyToMessageId: input.messageId
    });

  const isGroup = input.chat.type === "group" || input.chat.type === "supergroup";
  if (!isGroup) {
    await reply("این دستور را داخل گروه، روی خود عکس، ریپلی کن.");
    return true;
  }
  if (!input.from) {
    await reply("شناسه ادمین مشخص نیست.");
    return true;
  }
  const admin = await findEventAdmin(input.from.id);
  if (!admin) {
    await reply(`فقط ادمین ${escapeHtml(APP_NAME)} می‌تواند عکس را به برنامه ببرد.`);
    return true;
  }
  if (!input.replyTo || input.replyTo.is_bot || !input.fileId) {
    await reply("روی خود عکس ریپلی کن و /photo را بزن.");
    return true;
  }

  const events = await prisma.event.findMany({
    where: {
      communityId: admin.communityId,
      deletedAt: null,
      status: EventStatus.COMPLETED
    },
    orderBy: { startTime: "desc" },
    take: 8,
    select: { id: true, title: true, eventNumber: true }
  });
  if (events.length === 0) {
    await reply("هنوز برنامهٔ برگزارشده‌ای نیست.");
    return true;
  }

  const token = rememberPhoto({
    fileId: input.fileId,
    caption: input.caption,
    person: input.replyTo
  });
  const name = escapeHtml(
    [input.replyTo.first_name, input.replyTo.last_name].filter(Boolean).join(" ") ||
      input.replyTo.username ||
      "این عکس"
  );
  await sendTelegramMessage({
    chatId: input.chat.id,
    text: `${name} را به کدام برنامه اضافه کنم؟`,
    parseMode: "HTML",
    threadId: input.threadId,
    replyToMessageId: input.messageId,
    inlineKeyboard: {
      inline_keyboard: events.map((event) => [
        {
          text: buttonLabel(`${event.eventNumber}. ${event.title}`),
          callback_data: `ph:${token}:${event.id}`
        }
      ])
    }
  });
  return true;
}

export async function handlePhotoChoice(input: {
  callbackId: string;
  data: string;
  from?: Person;
  chat?: Chat;
  messageId?: number;
}) {
  if (!input.data.startsWith("ph:")) return false;
  const [, token, eventId] = input.data.split(":");
  const photo = token ? takePhoto(token) : null;
  if (!token || !eventId || !photo) {
    await answerTelegramCallback(input.callbackId, "این دکمه دیگر معتبر نیست. دوباره روی عکس /photo بزن.");
    return true;
  }
  if (!input.from) {
    await answerTelegramCallback(input.callbackId);
    return true;
  }
  const admin = await findEventAdmin(input.from.id);
  if (!admin) {
    await answerTelegramCallback(input.callbackId, "فقط ادمین می‌تواند عکس را اضافه کند.");
    return true;
  }

  const sender = await prisma.user.findUnique({
    where: { telegramId: BigInt(photo.person.id) }
  });
  if (!sender || sender.deletedAt) {
    await answerTelegramCallback(input.callbackId, "این شخص هنوز حساب ندارد.");
    if (input.chat && input.messageId) {
      await editTelegramMessage({
        chatId: input.chat.id,
        messageId: input.messageId,
        text: "این شخص هنوز در رو به راه حساب ندارد. اول با /add اضافه‌اش کن."
      });
    }
    return true;
  }

  try {
    const file = await downloadTelegramFile(photo.fileId);
    const service = new EventPhotoService();
    const created = await service.upload({
      userId: sender.id,
      eventId,
      buffer: file.buffer,
      filename: file.filename,
      mimeType: file.mimeType,
      caption: photo.caption
    });
    await service.review({
      photoId: created.id,
      reviewerId: admin.id,
      status: ModerationStatus.APPROVED
    });
    pendingPhotos.delete(token);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true }
    });
    const text = `عکس ${escapeHtml(getDisplayName(sender))} به ${escapeHtml(event?.title ?? "برنامه")} اضافه شد.`;
    if (input.chat && input.messageId) {
      await editTelegramMessage({
        chatId: input.chat.id,
        messageId: input.messageId,
        text
      });
    }
    await answerTelegramCallback(input.callbackId, "اضافه شد");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await answerTelegramCallback(input.callbackId, "این عکس قبلاً ثبت شده.");
      return true;
    }
    const text = photoError(error);
    if (input.chat && input.messageId) {
      await editTelegramMessage({
        chatId: input.chat.id,
        messageId: input.messageId,
        text
      });
    }
    await answerTelegramCallback(input.callbackId, text.slice(0, 180));
  }
  return true;
}
