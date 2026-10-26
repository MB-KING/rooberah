import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sendHelpMessage, sendStartMessage } from "@/lib/telegram-bot";
import { pathFromStartParam } from "@/lib/telegram-format";
import {
  deactivateTelegramResourceByChatId,
  handleAddChoice,
  handleGroupAdminCommand,
  handleReplyAddCommand,
  trackMembershipUpdate
} from "@/modules/telegram/group-commands";
import {
  handlePhotoChoice,
  handleReplyPhotoCommand
} from "@/modules/telegram/group-photo";

type TelegramPerson = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
};

type TelegramUpdate = {
  message?: {
    message_id?: number;
    chat?: { id?: number; type?: string; title?: string; username?: string };
    from?: TelegramPerson;
    reply_to_message?: {
      from?: TelegramPerson;
      caption?: string;
      photo?: { file_id?: string }[];
      document?: { file_id?: string; mime_type?: string };
    };
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
  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramPerson;
    message?: {
      message_id?: number;
      chat?: { id?: number; type?: string; title?: string; username?: string };
    };
  };
};

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const choice = update.callback_query;
    if (choice?.id && choice.data) {
      const person = choice.from?.id
        ? {
            id: choice.from.id,
            username: choice.from.username,
            first_name: choice.from.first_name,
            last_name: choice.from.last_name,
            is_bot: choice.from.is_bot
          }
        : undefined;
      const choiceInput = {
        callbackId: choice.id,
        data: choice.data,
        from: person,
        chat: choice.message?.chat?.id
          ? {
              id: choice.message.chat.id,
              type: choice.message.chat.type,
              title: choice.message.chat.title,
              username: choice.message.chat.username
            }
          : undefined,
        messageId: choice.message?.message_id
      };
      const added = await handleAddChoice(choiceInput);
      if (!added) await handlePhotoChoice(choiceInput);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message?.chat?.id;
    const chatType = message?.chat?.type;
    const text = message?.text?.trim() ?? "";
    const isPrivate = chatType === "private";

    if (message?.chat && text) {
      const person = (user: TelegramPerson | undefined) =>
        user?.id
          ? {
              id: user.id,
              username: user.username,
              first_name: user.first_name,
              last_name: user.last_name,
              is_bot: user.is_bot
            }
          : undefined;
      const replied = message.reply_to_message;
      const photoFileId =
        replied?.photo?.at(-1)?.file_id ||
        (replied?.document?.mime_type?.startsWith("image/")
          ? replied.document.file_id
          : undefined);
      const photoHandled = await handleReplyPhotoCommand({
        text,
        chat: {
          id: message.chat.id!,
          type: message.chat.type,
          title: message.chat.title,
          username: message.chat.username
        },
        threadId: message.is_topic_message ? message.message_thread_id : undefined,
        messageId: message.message_id,
        from: person(message.from),
        replyTo: person(replied?.from),
        fileId: photoFileId,
        caption: replied?.caption
      });
      if (photoHandled) {
        return NextResponse.json({ ok: true });
      }
      const added = await handleReplyAddCommand({
        text,
        chat: {
          id: message.chat.id!,
          type: message.chat.type,
          title: message.chat.title,
          username: message.chat.username
        },
        threadId: message.is_topic_message ? message.message_thread_id : undefined,
        messageId: message.message_id,
        from: person(message.from),
        replyTo: person(message.reply_to_message?.from)
      });
      if (added) {
        return NextResponse.json({ ok: true });
      }
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
