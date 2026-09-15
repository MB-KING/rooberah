import type { Prisma } from "@prisma/client";
import { APP_NAME } from "@/shared/brand";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { formatNotificationHtml } from "@/lib/telegram-format";

export async function logActivity(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata
    }
  });
}

export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  eventPath?: string;
  buttonText?: string;
  telegramOnly?: boolean;
}) {
  const notification = input.telegramOnly
    ? null
    : await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body
        }
      });

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { telegramId: true, deletedAt: true }
  });

  let telegramDelivered = false;
  if (user && !user.deletedAt) {
    const result = await sendTelegramMessage({
      chatId: user.telegramId,
      text: formatNotificationHtml(input.title, input.body),
      parseMode: "HTML",
      openApp: true,
      eventPath: input.eventPath,
      buttonText: input.buttonText ?? `باز کردن ${APP_NAME}`
    });
    telegramDelivered = result.ok;
  }

  return { notification, telegramDelivered };
}
