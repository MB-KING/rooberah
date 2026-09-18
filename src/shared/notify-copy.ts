import { APP_NAME } from "@/shared/brand";
import { MEETING_TIME_LABEL, START_TIME_LABEL } from "@/shared/copy";

export const notifyButtons = {
  openApp: `باز کردن ${APP_NAME}`,
  viewEvent: "مشاهده برنامه",
  signup: "مشاهده و ثبت‌نام",
  feedback: "ثبت نظر و عکس",
  profile: "مشاهده پروفایل",
  businesses: "مشاهده کسب‌وکارها",
  rewards: "مشاهده مزیت‌ها"
} as const;

export function quoteTitle(title: string) {
  return `«${title.trim()}»`;
}

export function registrationConfirmedCopy(eventTitle: string) {
  return {
    title: "✅ ثبت‌نامت قطعی شد",
    body: `برای ${quoteTitle(eventTitle)} ثبت‌نام شدی. منتظر دیدارت هستیم.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function registrationWaitlistedCopy(eventTitle: string) {
  return {
    title: "⏳ رفتی توی لیست انتظار",
    body: `الان در لیست انتظار ${quoteTitle(eventTitle)} هستی. اگر جا باز شود همین‌جا خبرت می‌کنیم.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function registrationCancelledCopy(eventTitle: string) {
  return {
    title: "↩️ ثبت‌نام لغو شد",
    body: `ثبت‌نامت برای ${quoteTitle(eventTitle)} لغو شد.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function waitlistPromotedCopy(eventTitle: string) {
  return {
    title: "🎉 جات در برنامه قطعی شد",
    body: `از لیست انتظار ${quoteTitle(eventTitle)} به ثبت‌نام قطعی منتقل شدی. منتظر دیدارت هستیم.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function eventDayReminderCopy(input: {
  title: string;
  meetingTimeLabel: string;
  locationName: string;
}) {
  return {
    title: "🔔 یادآوری برنامه امروز",
    body: [
      `امروز ${quoteTitle(input.title)} داری.`,
      `${MEETING_TIME_LABEL}: ${input.meetingTimeLabel}`,
      `مکان: ${input.locationName}`,
      "",
      "حدود دو ساعت قبل از قرار دوباره خبرت می‌کنیم."
    ].join("\n"),
    buttonText: notifyButtons.viewEvent
  };
}

export function eventTwoHourReminderCopy(input: {
  title: string;
  dateLabel: string;
  meetingTimeLabel: string;
  locationName: string;
}) {
  return {
    title: "⏰ دو ساعت تا برنامه",
    body: [
      `حدود دو ساعت دیگر قرار ${quoteTitle(input.title)} است.`,
      input.dateLabel,
      `${MEETING_TIME_LABEL}: ${input.meetingTimeLabel}`,
      `مکان: ${input.locationName}`
    ].join("\n"),
    buttonText: notifyButtons.viewEvent
  };
}

export function attendancePresentCopy(input: {
  eventTitle: string;
  eventCompleted: boolean;
}) {
  return {
    title: "✅ حضورت تأیید شد",
    body: input.eventCompleted
      ? `حضور تو در ${quoteTitle(input.eventTitle)} ثبت شد. حالا می‌توانی نظر و عکس برنامه را بفرستی.`
      : `حضور تو در ${quoteTitle(input.eventTitle)} ثبت شد. بعد از اتمام برنامه می‌توانی نظر و عکس بفرستی.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function attendanceUpdatedCopy(eventTitle: string, statusLabel: string) {
  return {
    title: "📋 وضعیت حضورت عوض شد",
    body: `وضعیت حضور ${quoteTitle(eventTitle)}: ${statusLabel}`,
    buttonText: notifyButtons.viewEvent
  };
}

export function feedbackInviteCopy(eventTitle: string) {
  return {
    title: "📝 نظرت و عکس‌هایت را بفرست",
    body: [
      `برنامه ${quoteTitle(eventTitle)} تمام شد.`,
      "اگر حضورت تأیید شده، نظرت را بنویس و عکس‌های مسیر را آپلود کن.",
      "بعد از تأیید، برای بقیه همراهان هم دیده می‌شود."
    ].join("\n"),
    buttonText: notifyButtons.feedback
  };
}

export function feedbackReviewedCopy(eventTitle: string, approved: boolean) {
  return {
    title: approved ? "📝 نظرت منتشر شد" : "📝 نظرت تأیید نشد",
    body: approved
      ? `نظرت برای ${quoteTitle(eventTitle)} الان روی صفحه برنامه دیده می‌شود.`
      : `نظرت برای ${quoteTitle(eventTitle)} تأیید نشد. می‌توانی دوباره بفرستی.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function photoReviewedCopy(input: {
  eventTitle: string;
  approved: boolean;
  awardedXp: boolean;
}) {
  return {
    title: input.approved ? "📸 عکست منتشر شد" : "📸 عکست تأیید نشد",
    body: input.approved
      ? input.awardedXp
        ? `عکست در ${quoteTitle(input.eventTitle)} دیده می‌شود و امتیاز گرفتی.`
        : `عکست در ${quoteTitle(input.eventTitle)} دیده می‌شود.`
      : `عکست برای ${quoteTitle(input.eventTitle)} تأیید نشد.`,
    buttonText: notifyButtons.viewEvent
  };
}

export function rewardRedeemedCopy(rewardTitle: string, code?: string | null) {
  return {
    title: "🎁 مزیت دریافت شد",
    body: code
      ? `${quoteTitle(rewardTitle)} فعال شد.\nکد: ${code}`
      : `${quoteTitle(rewardTitle)} برات ثبت شد.`,
    buttonText: notifyButtons.profile
  };
}

export function businessStatusCopy(businessName: string, statusLabel: string) {
  return {
    title: "🏪 وضعیت کسب‌وکار عوض شد",
    body: `${quoteTitle(businessName)} الان ${statusLabel} است.`,
    buttonText: notifyButtons.businesses
  };
}

export function rewardStatusCopy(rewardTitle: string, statusLabel: string) {
  return {
    title: "🎁 وضعیت مزیت عوض شد",
    body: `${quoteTitle(rewardTitle)} الان ${statusLabel} است.`,
    buttonText: notifyButtons.rewards
  };
}

export function redemptionStatusCopy(rewardTitle: string, statusLabel: string) {
  return {
    title: "📦 وضعیت دریافت مزیت عوض شد",
    body: `${quoteTitle(rewardTitle)}: ${statusLabel}`,
    buttonText: notifyButtons.profile
  };
}

export function specialBadgeCopy(badgeName: string) {
  return {
    title: "🏅 نشان ویژه گرفتی",
    body: `نشان ${quoteTitle(badgeName)} به پروفایلت اضافه شد.`,
    buttonText: notifyButtons.profile
  };
}

export function groupAddedCopy(groupName: string) {
  return [
    `گروه «${groupName}» در ${APP_NAME} ثبت شد.`,
    "از این به بعد اعلان برنامه‌های جدید همین‌جا می‌آید."
  ].join("\n");
}

export function groupRemovedCopy(removed: boolean) {
  return removed
    ? `گروه از منابع فعال ${APP_NAME} خارج شد. دیگر اعلان خودکار نمی‌آید.`
    : "این گروه در سیستم ثبت نشده بود.";
}

export function groupStatusCopy(input: {
  isActive: boolean;
  receiveAnnouncements: boolean;
  chatId: string;
  registered: boolean;
}) {
  if (!input.registered) {
    return `گروه ثبت نشده.\nشناسه چت: ${input.chatId}`;
  }
  return [
    "وضعیت گروه",
    "",
    `وضعیت: ${input.isActive ? "فعال" : "غیرفعال"}`,
    `اعلان خودکار: ${input.receiveAnnouncements ? "روشن" : "خاموش"}`,
    `شناسه چت: ${input.chatId}`
  ].join("\n");
}

export function startMessageLines() {
  return [
    `به ${APP_NAME} خوش آمدی`,
    "",
    "اینجا برنامه‌های پیاده‌روی را می‌بینی، ثبت‌نام می‌کنی و با همراهان هم‌قدم می‌شوی.",
    "",
    "برای ورود، دکمه زیر را بزن."
  ];
}

export function helpMessageLines() {
  return [
    `راهنمای ${APP_NAME}`,
    "",
    "• مینی‌اپ را از دکمه زیر باز کن",
    "• برنامه‌ها را ببین و ثبت‌نام کن",
    "• پروفایل و نشان‌هایت را کامل کن",
    "• یادآوری قرار از همین ربات می‌آید",
    "",
    "اگر دکمه کار نکرد، منوی پایین همین چت را بزن."
  ];
}

export const TELEGRAM_CAPTION_LIMIT = 1024;
export const TELEGRAM_MESSAGE_LIMIT = 4096;
