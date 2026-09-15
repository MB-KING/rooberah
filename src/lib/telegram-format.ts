import { APP_NAME } from "@/shared/brand";

/** Client-safe Telegram text helpers (no server secrets). */

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Strip HTML tags for plain-text Telegram fallback. */
export function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function pathFromStartParam(param: string): string | null {
  const value = param.trim();
  if (!value || value === "home") return "/";

  if (value.startsWith("e_")) {
    const id = value.slice(2);
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      return `/events/${id}`;
    }
  }

  if (value.includes("__")) {
    return `/${value.replace(/__/g, "/")}`;
  }

  // Single-segment Mini App paths: me, rewards, members, events, ...
  if (/^[a-z][a-z0-9_-]*$/i.test(value)) {
    return `/${value}`;
  }

  return null;
}

export function isGroupOrChannelChat(chatId: number | string | bigint) {
  try {
    return BigInt(chatId.toString()) < 0n;
  } catch {
    return String(chatId).startsWith("-");
  }
}

export function formatNotificationHtml(title: string, body: string) {
  return `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
}

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

function truncatePlain(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function formatEventAnnounceHtml(event: {
  title: string;
  eventNumber: number;
  date: Date;
  meetingTime: Date;
  startTime: Date;
  locationName: string;
  description?: string | null;
}) {
  const lines = [
    `<b>برنامه جدید ${APP_NAME}</b>`,
    "────────────",
    `<b>${escapeHtml(event.title)}</b>`,
    `شماره ${escapeHtml(String(event.eventNumber))}`,
    "",
    `📅 ${escapeHtml(faDateFormatter.format(event.date))}`,
    `🕐 جمع شدن: ${escapeHtml(faTimeFormatter.format(event.meetingTime))}`,
    `🚶 شروع مسیر: ${escapeHtml(faTimeFormatter.format(event.startTime))}`,
    `📍 ${escapeHtml(event.locationName)}`
  ];

  const description = event.description?.trim();
  if (description) {
    lines.push("", escapeHtml(truncatePlain(description, 180)));
  }

  lines.push("", "✅ برای جزئیات و ثبت‌نام، دکمه زیر را بزن.");
  return lines.join("\n");
}

export function formatStartMessageHtml() {
  return [
    `<b>به ${APP_NAME} خوش آمدی</b>`,
    "",
    "🥾 اینجا برنامه‌های پیاده‌روی و دورهمی‌ها را می‌بینی، ثبت‌نام می‌کنی و با بقیه همراه می‌شوی.",
    "",
    "👇 برای ورود، دکمه زیر را بزن."
  ].join("\n");
}

export function formatHelpMessageHtml() {
  return [
    `<b>راهنمای ${APP_NAME}</b>`,
    "",
    "• 📱 از دکمه زیر مینی‌اپ را باز کن",
    "• 🥾 برنامه‌ها را ببین و ثبت‌نام کن",
    "• 🔔 یادآوری قرار از همین ربات می‌آید",
    "",
    "اگر دکمه کار نکرد، منوی پایین چت را بزن."
  ].join("\n");
}

export function botUsername() {
  return (
    process.env.TELEGRAM_BOT_USERNAME ??
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    "HamMasirClubBot"
  ).replace(/^@/, "");
}

/** Deep link that opens the Mini App from groups/channels (url buttons). */
export function telegramDeepLink(path?: string) {
  const username = botUsername();
  if (!path || path === "/") {
    return `https://t.me/${username}?startapp=home`;
  }

  const eventMatch = path.match(/^\/events\/([0-9a-f-]{36})$/i);
  if (eventMatch) {
    return `https://t.me/${username}?startapp=e_${eventMatch[1]}`;
  }

  const compact = path.replace(/^\//, "").replace(/\//g, "__").slice(0, 64);
  return `https://t.me/${username}?startapp=${compact}`;
}

export function isPermanentTelegramChatError(reason: string) {
  const text = reason.toLowerCase();
  return (
    text.includes("chat not found") ||
    text.includes("bot is not a member") ||
    text.includes("bot was kicked") ||
    text.includes("have no rights to send") ||
    text.includes("not enough rights") ||
    text.includes("peer_id_invalid") ||
    text.includes("group chat was upgraded")
  );
}
