import {
  EventStatus,
  Role,
  TelegramMembershipStatus,
  TelegramResourceType
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { APP_NAME } from "@/shared/brand";
import { prisma } from "@/lib/prisma";
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendTelegramMessage
} from "@/lib/telegram-bot";
import { escapeHtml } from "@/lib/telegram-format";
import { logActivity, notifyUser } from "@/modules/activity/activity.service";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { RegistrationService } from "@/modules/registrations/registration.service";
import { AppError, errorMessagesFa } from "@/shared/errors";
import { manualAddInviteCopy, quoteTitle } from "@/shared/notify-copy";
import { getDisplayName } from "@/shared/privacy";

type Chat = {
  id: number;
  type?: string;
  title?: string;
  username?: string;
};

type FromUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
};

async function findSuperAdminByTelegramId(telegramId: number) {
  return prisma.user.findFirst({
    where: {
      telegramId: BigInt(telegramId),
      deletedAt: null,
      roles: { some: { role: Role.SUPER_ADMIN } }
    }
  });
}

function groupLink(chat: Chat) {
  if (chat.username) return `https://t.me/${chat.username}`;
  const raw = String(chat.id);
  if (raw.startsWith("-100")) {
    return `https://t.me/c/${raw.slice(4)}`;
  }
  return `https://t.me/c/${raw.replace(/^-/, "")}`;
}

export async function deactivateTelegramResourceByChatId(chatId: number) {
  try {
    const updated = await prisma.telegramResource.updateMany({
      where: { telegramChatId: BigInt(chatId) },
      data: { isActive: false, receiveAnnouncements: false }
    });
    if (updated.count > 0) {
      logger.info("telegram_resource_deactivated_bot_left", {
        chatId,
        count: updated.count
      });
    }
  } catch (error) {
    logger.warn("telegram_resource_deactivate_failed", {
      chatId,
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}

export async function handleGroupAdminCommand(input: {
  text: string;
  chat: Chat;
  threadId?: number;
  from?: FromUser;
}) {
  const text = input.text.trim();
  const command = text.split(/\s+/)[0]?.replace(/@\w+$/i, "").toLowerCase();
  if (!command?.startsWith("/")) return false;

  const isGroup =
    input.chat.type === "group" || input.chat.type === "supergroup";

  if (
    command !== "/addgroup" &&
    command !== "/removegroup" &&
    command !== "/groupstatus"
  ) {
    return false;
  }

  if (!input.from) {
    await sendTelegramMessage({
      chatId: input.chat.id,
      text: "⚠️ شناسه کاربر مشخص نیست.",
      parseMode: "HTML",
      threadId: input.threadId
    });
    return true;
  }

  const admin = await findSuperAdminByTelegramId(input.from.id);
  if (!admin) {
    await sendTelegramMessage({
      chatId: input.chat.id,
      text: `⛔ فقط سوپرادمین ${escapeHtml(APP_NAME)} می‌تواند این دستور را اجرا کند.`,
      parseMode: "HTML",
      threadId: input.threadId
    });
    return true;
  }

  if (!isGroup) {
    await sendTelegramMessage({
      chatId: input.chat.id,
      text: "👥 این دستور را داخل گروه اجرا کن.",
      parseMode: "HTML",
      threadId: input.threadId
    });
    return true;
  }

  if (command === "/addgroup") {
    const topicTitle =
      text.split(/\s+/).slice(1).join(" ").trim() ||
      (input.threadId ? `تاپیک ${input.threadId}` : "");
    const existing = await prisma.telegramResource.findFirst({
      where: {
        communityId: admin.communityId,
        telegramChatId: BigInt(input.chat.id)
      }
    });

    const resource = existing
      ? await prisma.telegramResource.update({
          where: { id: existing.id },
          data: {
            name: input.chat.title ?? existing.name,
            link: groupLink(input.chat),
            isActive: true,
            type: TelegramResourceType.GROUP,
            receiveAnnouncements: true,
            telegramThreadId: existing.telegramThreadId ?? input.threadId ?? null
          }
        })
      : await prisma.telegramResource.create({
          data: {
            communityId: admin.communityId,
            name: input.chat.title ?? `گروه ${APP_NAME}`,
            description: "ثبت‌شده از دستور /addgroup",
            link: groupLink(input.chat),
            type: TelegramResourceType.GROUP,
            telegramChatId: BigInt(input.chat.id),
            telegramThreadId: input.threadId ?? null,
            isActive: true,
            receiveAnnouncements: true
          }
        });

    if (input.threadId && topicTitle) {
      await prisma.telegramForumTopic.upsert({
        where: {
          resourceId_threadId: {
            resourceId: resource.id,
            threadId: input.threadId
          }
        },
        create: {
          resourceId: resource.id,
          threadId: input.threadId,
          title: topicTitle
        },
        update: { title: topicTitle }
      });
    }

    const topicNote = input.threadId
      ? `\nتاپیک «${escapeHtml(topicTitle)}» ذخیره شد.`
      : "";
    await sendTelegramMessage({
      chatId: input.chat.id,
      text: `✅ گروه «<b>${escapeHtml(resource.name)}</b>» در ${escapeHtml(APP_NAME)} ثبت شد.\nاز این به بعد اعلان برنامه‌های جدید همین‌جا می‌آید.${topicNote}`,
      parseMode: "HTML",
      threadId: input.threadId
    });
    return true;
  }

  if (command === "/removegroup") {
    const updated = await prisma.telegramResource.updateMany({
      where: {
        communityId: admin.communityId,
        telegramChatId: BigInt(input.chat.id)
      },
      data: { isActive: false, receiveAnnouncements: false }
    });
    await sendTelegramMessage({
      chatId: input.chat.id,
      text:
        updated.count > 0
          ? `❎ گروه از منابع فعال ${escapeHtml(APP_NAME)} خارج شد. دیگر اعلان خودکار نمی‌آید.`
          : "ℹ️ این گروه در سیستم ثبت نشده بود.",
      parseMode: "HTML",
      threadId: input.threadId
    });
    return true;
  }

  const resource = await prisma.telegramResource.findFirst({
    where: {
      communityId: admin.communityId,
      telegramChatId: BigInt(input.chat.id)
    }
  });
  const topics = resource
    ? await prisma.telegramForumTopic.findMany({
        where: { resourceId: resource.id },
        orderBy: { title: "asc" }
      })
    : [];
  const topicList =
    topics.length > 0
      ? [
          "تاپیک‌های ذخیره‌شده:",
          ...topics.map(
            (topic) =>
              `• ${escapeHtml(topic.title)} (<code>${topic.threadId}</code>)`
          )
        ].join("\n")
      : `شناسه تاپیک: <code>${escapeHtml(String(resource?.telegramThreadId ?? input.threadId ?? "—"))}</code>`;
  await sendTelegramMessage({
    chatId: input.chat.id,
    text: resource
      ? [
          "📊 <b>وضعیت گروه</b>",
          "",
          `وضعیت: ${resource.isActive ? "✅ فعال" : "❎ غیرفعال"}`,
          `اعلان خودکار برنامه‌ها: ${resource.receiveAnnouncements ? "🔔 روشن" : "🔕 خاموش"}`,
          `شناسه چت: <code>${escapeHtml(String(input.chat.id))}</code>`,
          topicList
        ].join("\n")
      : `ℹ️ گروه ثبت نشده.\nشناسه چت: <code>${escapeHtml(String(input.chat.id))}</code>${
          input.threadId
            ? `\nشناسه تاپیک: <code>${escapeHtml(String(input.threadId))}</code>`
            : ""
        }`,
    parseMode: "HTML",
    threadId: input.threadId
  });
  return true;
}

function commandToken(text: string) {
  return text.trim().split(/\s+/)[0]?.replace(/@\w+$/i, "").toLowerCase() ?? "";
}

function buttonLabel(title: string) {
  const chars = Array.from(title.trim());
  if (chars.length <= 40) return chars.join("");
  return `${chars.slice(0, 39).join("")}…`;
}

function openEventWhere(communityId: string) {
  return {
    communityId,
    deletedAt: null,
    status: EventStatus.PUBLISHED,
    startTime: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
  };
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

async function ensureMember(replyTo: FromUser) {
  const telegramId = BigInt(replyTo.id);
  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (existing?.deletedAt) {
    return { ok: false as const, error: "این حساب بسته شده." };
  }
  if (existing) return { ok: true as const, user: existing, created: false as const };
  const user = await new AuthRepository(prisma).upsertTelegramUser({
    id: replyTo.id,
    first_name: replyTo.first_name || replyTo.username || "همراه",
    last_name: replyTo.last_name,
    username: replyTo.username
  });
  return { ok: true as const, user, created: true as const };
}

async function finishAdd(input: {
  adminId: string;
  user: { id: string; firstName: string | null; lastName: string | null; username: string | null };
  created: boolean;
  event: { id: string; title: string };
}) {
  const name = escapeHtml(getDisplayName(input.user));
  const title = escapeHtml(quoteTitle(input.event.title));
  try {
    const registration = await new RegistrationService().register(input.user.id, input.event.id, {
      skipMembershipGate: true
    });
    let text =
      registration.status === "WAITLISTED"
        ? `⏳ ${name} در انتظار ${title} ماند.`
        : `✅ ${name} به ${title} اضافه شد.`;
    if (input.created) {
      const invite = manualAddInviteCopy(input.event.title);
      const sent = await notifyUser({
        userId: input.user.id,
        type: "MANUAL_ADD_INVITE",
        title: invite.title,
        body: invite.body,
        eventPath: "/me/settings",
        buttonText: invite.buttonText
      });
      text += sent.telegramDelivered
        ? "\nحسابش تازه ساخته شد و به خودش گفتم اطلاعاتش را کامل کند."
        : "\nحسابش ساخته شد، ولی پیام خصوصی نرسید. یک بار ربات را استارت کند و اطلاعاتش را کامل کند.";
    }
    await logActivity({
      actorUserId: input.adminId,
      action: "MEMBER_ADDED_FROM_REPLY",
      entityType: "EventRegistration",
      entityId: input.event.id,
      metadata: { userId: input.user.id, created: input.created }
    });
    revalidatePath("/events");
    revalidatePath(`/events/${input.event.id}`);
    revalidatePath("/members");
    revalidatePath(`/admin/events/${input.event.id}/attendance`);
    return text;
  } catch (error) {
    if (error instanceof AppError && error.code === "ALREADY_REGISTERED") {
      return `ℹ️ ${name} قبلاً برای ${title} ثبت‌نام کرده.`;
    }
    logger.warn("reply_add_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    const reason =
      error instanceof AppError ? errorMessagesFa[error.code] : "اضافه کردن انجام نشد.";
    return input.created
      ? `حساب ${name} ساخته شد، ولی به برنامه اضافه نشد. ${escapeHtml(reason)}`
      : escapeHtml(reason);
  }
}

export async function handleReplyAddCommand(input: {
  text: string;
  chat: Chat;
  threadId?: number;
  messageId?: number;
  from?: FromUser;
  replyTo?: FromUser;
}) {
  if (commandToken(input.text) !== "/add") return false;

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
    await reply("👥 این دستور را داخل گروه، روی پیام همان شخص، ریپلی کن.");
    return true;
  }
  if (!input.from) {
    await reply("⚠️ شناسه ادمین مشخص نیست.");
    return true;
  }

  const admin = await findEventAdmin(input.from.id);
  if (!admin) {
    await reply(`⛔ فقط ادمین ${escapeHtml(APP_NAME)} می‌تواند کسی را اضافه کند.`);
    return true;
  }
  if (!input.replyTo || input.replyTo.is_bot) {
    await reply("روی پیام همان شخص ریپلی کن و دوباره /add را بزن.");
    return true;
  }

  const events = await prisma.event.findMany({
    where: openEventWhere(admin.communityId),
    orderBy: { startTime: "asc" },
    select: { id: true, title: true }
  });
  if (events.length === 0) {
    await reply("الان برنامهٔ بازی برای ثبت‌نام نیست.");
    return true;
  }

  const member = await ensureMember(input.replyTo);
  if (!member.ok) {
    await reply(member.error);
    return true;
  }

  if (events.length > 2) {
    const name = escapeHtml(getDisplayName(member.user));
    await sendTelegramMessage({
      chatId: input.chat.id,
      text: `${name} را به کدام برنامه اضافه کنم؟`,
      parseMode: "HTML",
      threadId: input.threadId,
      replyToMessageId: input.messageId,
      inlineKeyboard: {
        inline_keyboard: events.map((event) => [
          {
            text: buttonLabel(event.title),
            callback_data: `add:${member.created ? 1 : 0}:${input.replyTo!.id}:${event.id}`
          }
        ])
      }
    });
    return true;
  }

  await reply(
    await finishAdd({
      adminId: admin.id,
      user: member.user,
      created: member.created,
      event: events[0]
    })
  );
  return true;
}

export async function handleAddChoice(input: {
  callbackId: string;
  data: string;
  from?: FromUser;
  chat?: Chat;
  messageId?: number;
}) {
  if (!input.data.startsWith("add:")) return false;
  const [, createdFlag, telegramUserId, eventId] = input.data.split(":");
  if (
    (createdFlag !== "0" && createdFlag !== "1") ||
    !telegramUserId ||
    !/^\d+$/.test(telegramUserId) ||
    !eventId
  ) {
    await answerTelegramCallback(input.callbackId, "این دکمه دیگر معتبر نیست.");
    return true;
  }
  if (!input.from) {
    await answerTelegramCallback(input.callbackId);
    return true;
  }

  const admin = await findEventAdmin(input.from.id);
  if (!admin) {
    await answerTelegramCallback(input.callbackId, "فقط ادمین می‌تواند اضافه کند.");
    return true;
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, ...openEventWhere(admin.communityId) },
    select: { id: true, title: true }
  });
  if (!event) {
    await answerTelegramCallback(input.callbackId, "این برنامه دیگر باز نیست.");
    return true;
  }

  const member = await ensureMember({ id: Number(telegramUserId) });
  if (!member.ok) {
    await answerTelegramCallback(input.callbackId, member.error);
    return true;
  }

  const text = await finishAdd({
    adminId: admin.id,
    user: member.user,
    created: createdFlag === "1",
    event
  });
  if (input.chat && input.messageId) {
    const edited = await editTelegramMessage({
      chatId: input.chat.id,
      messageId: input.messageId,
      text
    });
    if (!edited) {
      await sendTelegramMessage({
        chatId: input.chat.id,
        text,
        parseMode: "HTML"
      });
    }
  }
  await answerTelegramCallback(input.callbackId);
  return true;
}

export async function trackMembershipUpdate(input: {
  chatId: number;
  telegramUserId: number;
  status: string;
}) {
  try {
    const mapped =
      input.status === "member" || input.status === "restricted"
        ? TelegramMembershipStatus.MEMBER
        : input.status === "administrator"
          ? TelegramMembershipStatus.ADMIN
          : input.status === "creator"
            ? TelegramMembershipStatus.CREATOR
            : input.status === "left"
              ? TelegramMembershipStatus.LEFT
              : input.status === "kicked"
                ? TelegramMembershipStatus.KICKED
                : TelegramMembershipStatus.UNKNOWN;

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(input.telegramUserId) },
      select: { id: true }
    });
    const resource = await prisma.telegramResource.findFirst({
      where: { telegramChatId: BigInt(input.chatId) },
      select: { id: true }
    });

    const now = new Date();
    const active =
      mapped === TelegramMembershipStatus.MEMBER ||
      mapped === TelegramMembershipStatus.ADMIN ||
      mapped === TelegramMembershipStatus.CREATOR;

    await prisma.telegramGroupMembership.upsert({
      where: {
        chatId_telegramUserId: {
          chatId: BigInt(input.chatId),
          telegramUserId: BigInt(input.telegramUserId)
        }
      },
      create: {
        chatId: BigInt(input.chatId),
        telegramUserId: BigInt(input.telegramUserId),
        status: mapped,
        userId: user?.id,
        resourceId: resource?.id,
        joinedAt: active ? now : null,
        leftAt: active ? null : now,
        lastCheckedAt: now
      },
      update: {
        status: mapped,
        userId: user?.id,
        resourceId: resource?.id,
        leftAt: active ? null : now,
        ...(active ? { joinedAt: now } : {}),
        lastCheckedAt: now
      }
    });
  } catch (error) {
    logger.warn("membership_track_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}
