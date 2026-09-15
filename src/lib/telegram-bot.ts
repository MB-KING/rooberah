import { config } from "@/lib/config";
import { APP_NAME } from "@/shared/brand";
import { logger } from "@/lib/logger";
import {
  formatHelpMessageHtml,
  formatStartMessageHtml,
  isGroupOrChannelChat,
  stripHtml,
  telegramDeepLink
} from "@/lib/telegram-format";

const apiBase = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export type TelegramSendResult = {
  ok: true;
  messageId: number;
} | {
  ok: false;
  reason: string;
};

type TelegramMessage = {
  message_id: number;
};

async function callTelegram<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${apiBase}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const payload = (await response.json()) as {
    ok: boolean;
    description?: string;
    result: T;
  };
  if (!payload.ok) {
    throw new Error(payload.description ?? `Telegram API failed: ${method}`);
  }
  return payload.result;
}

async function callTelegramForm<T>(method: string, form: FormData): Promise<T> {
  const response = await fetch(`${apiBase}/${method}`, {
    method: "POST",
    body: form,
    cache: "no-store"
  });
  const payload = (await response.json()) as {
    ok: boolean;
    description?: string;
    result: T;
  };
  if (!payload.ok) {
    throw new Error(payload.description ?? `Telegram API failed: ${method}`);
  }
  return payload.result;
}

function photoBlobFromBuffer(buffer: Buffer, contentType: string) {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return new Blob([bytes], { type: contentType });
}

export function appPublicUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://hammasir.mbking.info"
  );
}

function buildAppKeyboard(input: {
  chatId: string;
  eventPath?: string;
  buttonText?: string;
}) {
  const label = input.buttonText ?? `باز کردن ${APP_NAME}`;
  const httpsApp = appPublicUrl().startsWith("https://");
  const webAppUrl = input.eventPath
    ? `${appPublicUrl()}${input.eventPath}`
    : appPublicUrl();

  // web_app buttons only work in private chats, and only with HTTPS URLs.
  if (isGroupOrChannelChat(input.chatId) || !httpsApp) {
    return {
      inline_keyboard: [
        [{ text: label, url: telegramDeepLink(input.eventPath) }]
      ]
    };
  }

  return {
    inline_keyboard: [[{ text: label, web_app: { url: webAppUrl } }]]
  };
}

export async function setupTelegramBot() {
  const url = appPublicUrl();

  await callTelegram("setMyCommands", {
    commands: [
      { command: "start", description: `شروع ${APP_NAME}` },
      { command: "app", description: "باز کردن مینی‌اپ" },
      { command: "help", description: "راهنما" },
      { command: "addgroup", description: "ثبت گروه فعلی (سوپرادمین)" },
      { command: "removegroup", description: "غیرفعال‌سازی گروه (سوپرادمین)" },
      { command: "groupstatus", description: "وضعیت گروه (سوپرادمین)" }
    ]
  });

  await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: APP_NAME,
      web_app: { url }
    }
  });

  await callTelegram("setWebhook", {
    url: `${url}/api/telegram/webhook`,
    allowed_updates: ["message", "my_chat_member", "chat_member"]
  });

  return { appUrl: url, webhook: `${url}/api/telegram/webhook` };
}

export async function sendStartMessage(chatId: number | string | bigint) {
  const id = chatId.toString();
  return callTelegram<TelegramMessage>("sendMessage", {
    chat_id: id,
    text: formatStartMessageHtml(),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildAppKeyboard({
      chatId: id,
      buttonText: `باز کردن ${APP_NAME}`
    })
  });
}

export async function sendHelpMessage(chatId: number | string | bigint) {
  const id = chatId.toString();
  return callTelegram<TelegramMessage>("sendMessage", {
    chat_id: id,
    text: formatHelpMessageHtml(),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buildAppKeyboard({
      chatId: id,
      buttonText: `باز کردن ${APP_NAME}`
    })
  });
}

async function sendWithHtmlFallback(input: {
  method: "sendMessage" | "sendPhoto";
  body: Record<string, unknown>;
  htmlText: string;
  textField: "text" | "caption";
}): Promise<TelegramMessage> {
  try {
    return await callTelegram<TelegramMessage>(input.method, {
      ...input.body,
      [input.textField]: input.htmlText,
      parse_mode: "HTML"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    if (!/parse|entities|can't find end/i.test(reason)) {
      throw error;
    }
    logger.warn("telegram_html_fallback", { reason });
    return callTelegram<TelegramMessage>(input.method, {
      ...input.body,
      [input.textField]: stripHtml(input.htmlText)
    });
  }
}

export async function sendTelegramMessage(input: {
  chatId: number | string | bigint;
  text: string;
  openApp?: boolean;
  eventPath?: string;
  buttonText?: string;
  parseMode?: "HTML";
}): Promise<TelegramSendResult> {
  const chatId = input.chatId.toString();
  const keyboard = input.openApp
    ? buildAppKeyboard({
        chatId,
        eventPath: input.eventPath,
        buttonText: input.buttonText
      })
    : undefined;

  try {
    const result =
      input.parseMode === "HTML"
        ? await sendWithHtmlFallback({
            method: "sendMessage",
            htmlText: input.text,
            textField: "text",
            body: {
              chat_id: chatId,
              disable_web_page_preview: true,
              reply_markup: keyboard
            }
          })
        : await callTelegram<TelegramMessage>("sendMessage", {
            chat_id: chatId,
            text: input.text,
            disable_web_page_preview: true,
            reply_markup: keyboard
          });

    return { ok: true, messageId: result.message_id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    logger.warn("telegram_send_failed", { chatId, reason });
    return { ok: false, reason };
  }
}

export async function sendTelegramPhoto(input: {
  chatId: number | string | bigint;
  photoFileId: string;
  caption: string;
  openApp?: boolean;
  eventPath?: string;
  buttonText?: string;
}): Promise<TelegramSendResult> {
  const chatId = input.chatId.toString();
  const keyboard = input.openApp
    ? buildAppKeyboard({
        chatId,
        eventPath: input.eventPath,
        buttonText: input.buttonText
      })
    : undefined;

  // Telegram captions max out at 1024 characters.
  const caption = input.caption.slice(0, 1024);

  try {
    const result = await sendWithHtmlFallback({
      method: "sendPhoto",
      htmlText: caption,
      textField: "caption",
      body: {
        chat_id: chatId,
        photo: input.photoFileId,
        reply_markup: keyboard
      }
    });
    return { ok: true, messageId: result.message_id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    logger.warn("telegram_photo_failed", { chatId, reason });
    // Fall back to text-only announce if photo send fails.
    return sendTelegramMessage({
      chatId,
      text: input.caption,
      parseMode: "HTML",
      openApp: input.openApp,
      eventPath: input.eventPath,
      buttonText: input.buttonText
    });
  }
}

export async function sendTelegramPhotoBuffer(input: {
  chatId: number | string | bigint;
  photo: Buffer;
  filename?: string;
  contentType?: string;
  caption: string;
  openApp?: boolean;
  eventPath?: string;
  buttonText?: string;
}): Promise<TelegramSendResult> {
  const chatId = input.chatId.toString();
  const contentType = input.contentType || "image/png";
  const filename = input.filename || "ham-masir-share.png";
  const keyboard = input.openApp
    ? buildAppKeyboard({
        chatId,
        eventPath: input.eventPath,
        buttonText: input.buttonText
      })
    : undefined;
  const caption = input.caption.slice(0, 1024);

  const buildForm = (html: boolean, text: string) => {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", text);
    if (html) form.append("parse_mode", "HTML");
    if (keyboard) form.append("reply_markup", JSON.stringify(keyboard));
    form.append("photo", photoBlobFromBuffer(input.photo, contentType), filename);
    return form;
  };

  const useHtml = /<\/?[a-z][\s\S]*>/i.test(caption);

  try {
    try {
      const result = await callTelegramForm<TelegramMessage>(
        "sendPhoto",
        buildForm(useHtml, caption)
      );
      return { ok: true, messageId: result.message_id };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      if (!/parse|entities|can't find end/i.test(reason)) {
        throw error;
      }
      logger.warn("telegram_html_fallback", { reason });
      const result = await callTelegramForm<TelegramMessage>(
        "sendPhoto",
        buildForm(false, stripHtml(caption))
      );
      return { ok: true, messageId: result.message_id };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    logger.warn("telegram_photo_buffer_failed", { chatId, reason });
    return { ok: false, reason };
  }
}

export async function savePreparedInlinePhoto(input: {
  telegramUserId: number | string | bigint;
  photoUrl: string;
  thumbnailUrl?: string;
  photoWidth?: number;
  photoHeight?: number;
  caption: string;
  buttonUrl?: string;
  buttonText?: string;
}): Promise<{ id: string; expirationDate: number }> {
  const caption = input.caption.slice(0, 1024);
  const keyboard = input.buttonUrl
    ? {
        inline_keyboard: [
          [
            {
              text: input.buttonText ?? "🥾 باز کردن برنامه",
              url: input.buttonUrl
            }
          ]
        ]
      }
    : undefined;
  const result = await callTelegram<{
    id: string;
    expiration_date: number;
  }>("savePreparedInlineMessage", {
    user_id: Number(input.telegramUserId.toString()),
    allow_user_chats: true,
    allow_group_chats: true,
    allow_channel_chats: true,
    result: {
      type: "photo",
      id: `share-${Date.now().toString(36)}`,
      photo_url: input.photoUrl,
      thumbnail_url: input.thumbnailUrl ?? input.photoUrl,
      photo_width: input.photoWidth,
      photo_height: input.photoHeight,
      caption,
      reply_markup: keyboard
    }
  });
  return { id: result.id, expirationDate: result.expiration_date };
}
