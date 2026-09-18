import {
  faTehranDateFormatter,
  faTehranTimeFormatter
} from "@/lib/tehran-time";
import { APP_NAME } from "@/shared/brand";
import { MEETING_TIME_LABEL, START_TIME_LABEL } from "@/shared/copy";

export const shareCardFormats = ["story", "square", "landscape"] as const;
export type ShareCardFormat = (typeof shareCardFormats)[number];

export type EventShareDetails = {
  title: string;
  dateLabel: string;
  meetingTime: string;
  startTime: string;
  locationName: string;
  locationAddress?: string | null;
};

export function shareDetailsFromEvent(event: {
  title: string;
  date: Date;
  meetingTime: Date;
  startTime: Date;
  locationName: string;
  locationAddress?: string | null;
}): EventShareDetails {
  return {
    title: event.title,
    dateLabel: faTehranDateFormatter.format(event.date),
    meetingTime: faTehranTimeFormatter.format(event.meetingTime),
    startTime: faTehranTimeFormatter.format(event.startTime),
    locationName: event.locationName,
    locationAddress: event.locationAddress
  };
}

export function eventShareText(eventTitle: string) {
  return `من با ${APP_NAME} می‌رم برنامه «${eventTitle}». اگر تو هم می‌آی خوشحال می‌شم ببینمت 🥾`;
}

export function eventShareDetailsText(details: EventShareDetails) {
  const address = details.locationAddress?.replace(/\s+/g, " ").trim();
  return [
    eventShareText(details.title),
    details.dateLabel,
    `${MEETING_TIME_LABEL} ${details.meetingTime}`,
    `${START_TIME_LABEL} ${details.startTime}`,
    details.locationName,
    address || null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function eventShareCaption(
  details: EventShareDetails | string,
  shareUrl: string
) {
  const text =
    typeof details === "string"
      ? eventShareText(details)
      : eventShareDetailsText(details);
  return `${text}\n\n${shareUrl}`;
}

/** Telegram captions mix RTL poorly with URLs and clock times; keep those on the image. */
export function eventShareTelegramCaption(eventTitle: string) {
  return eventShareText(eventTitle);
}

export function telegramShareUrl(url: string, text: string) {
  const share = new URL("https://t.me/share/url");
  share.searchParams.set("url", url);
  share.searchParams.set("text", text);
  return share.toString();
}

export function twitterShareUrl(url: string, text: string) {
  const share = new URL("https://twitter.com/intent/tweet");
  share.searchParams.set("text", `${text}\n${url}`);
  return share.toString();
}

export function linkedinShareUrl(url: string, text: string) {
  const body = [text.replace(/\s+$/u, ""), url].filter(Boolean).join("\n\n");
  const share = new URL("https://www.linkedin.com/feed/");
  share.searchParams.set("shareActive", "true");
  share.searchParams.set("mini", "true");
  share.searchParams.set("text", body);
  return share.toString();
}

export function publicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://rooberah.mbking.info"
  ).replace(/\/$/, "");
}

export function eventReferralUrl(eventId: string, referrerId?: string | null) {
  const url = new URL(`${publicAppUrl()}/events/${eventId}`);
  if (referrerId) url.searchParams.set("ref", referrerId);
  return url.toString();
}

export function eventShareCardUrl(
  eventId: string,
  options?: {
    format?: ShareCardFormat;
    userId?: string | null;
    mime?: "jpeg" | "png";
  }
) {
  const url = new URL(`${publicAppUrl()}/api/events/${eventId}/share-card`);
  url.searchParams.set("format", options?.format ?? "square");
  if (options?.userId) url.searchParams.set("u", options.userId);
  if (options?.mime) url.searchParams.set("mime", options.mime);
  return url.toString();
}
