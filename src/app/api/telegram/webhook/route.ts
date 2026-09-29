import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sendHelpMessage, sendStartMessage } from "@/lib/telegram-bot";
import { pathFromStartParam } from "@/lib/telegram-format";
import {
  deactivateTelegramResourceByChatId,
  handleGroupAdminCommand,
  trackMembershipUpdate
} from "@/modules/telegram/group-commands";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number; type?: string; title?: string; username?: string };
    from?: { id?: number; username?: string; first_name?: string };
    text?: string;
    message_thread_id?: number;
    is_topic_message?: boolean;
  };
  my_chat_member?: {
    chat?: { id?: number; type?: string };
    new_chat_member?: {
      user?: { id?: number; is_bot?: boolean };
      status?: string;
    };
  };
  chat_member?: {
    chat?: { id?: number };
    new_chat_member?: { user?: { id?: number }; status?: string };
  };
};

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    const chatId = message?.chat?.id;
    const chatType = message?.chat?.type;
    const text = message?.text?.trim() ?? "";
    const isPrivate = chatType === "private";

    if (message?.chat && text) {
      const handled = await handleGroupAdminCommand({
        text,
        chat: {
          id: message.chat.id!,
          type: message.chat.type,
          title: message.chat.title,
          username: message.chat.username
        },
        threadId: message.is_topic_message ? message.message_thread_id : undefined,
        from: message.from?.id
          ? {
              id: message.from.id,
              username: message.from.username,
              first_name: message.from.first_name
            }
          : undefined
      });
      if (handled) {
        return NextResponse.json({ ok: true });
      }
    }

    // Keep onboarding replies in private chats to avoid group spam.
    if (chatId && isPrivate) {
      if (/^\/help(?:@\w+)?/i.test(text)) {
        await sendHelpMessage(chatId);
      } else if (/^\/app(?:@\w+)?/i.test(text)) {
        await sendStartMessage(chatId);
      } else if (/^\/start(?:@\w+)?/i.test(text)) {
        const payload = text.replace(/^\/start(?:@\w+)?\s*/i, "").trim();
        const eventPath = payload ? pathFromStartParam(payload) : null;
        await sendStartMessage(chatId, eventPath);
      }
    }

    const myMember = update.my_chat_member?.new_chat_member;
    const myChatId = update.my_chat_member?.chat?.id;
    if (
      myChatId &&
      myMember?.user?.is_bot &&
      (myMember.status === "left" || myMember.status === "kicked")
    ) {
      await deactivateTelegramResourceByChatId(myChatId);
    }

    const membership =
      update.chat_member?.new_chat_member ??
      (myMember?.user && !myMember.user.is_bot ? myMember : undefined);
    const membershipChatId =
      update.chat_member?.chat?.id ??
      (membership ? update.my_chat_member?.chat?.id : undefined);
    if (membership?.user?.id && membershipChatId && membership.status) {
      await trackMembershipUpdate({
        chatId: membershipChatId,
        telegramUserId: membership.user.id,
        status: membership.status
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn("telegram_webhook_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    // Still ack so Telegram does not retry forever on bad payloads.
    return NextResponse.json({ ok: true });
  }
}
