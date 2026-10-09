import persian_ar from "react-date-object/locales/persian_ar";
import persian_fa from "react-date-object/locales/persian_fa";

/** Asia/Tehran wall-clock helpers. Iran has no DST (fixed UTC+03:30). */

export const TEHRAN_TIME_ZONE = "Asia/Tehran";
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function latinDigits(value: string) {
  const digits = [...persian_fa.digits, ...persian_ar.digits];
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const index = digits.indexOf(digit) % 10;
    return index >= 0 ? String(index) : digit;
  });
}

/** Interpret YYYY-MM-DD + HH:mm[:ss] as Tehran local time → UTC Date. */
export function tehranWallTimeToUtc(date: string, time = "00:00") {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(latinDigits(date.trim()));
  if (!dateMatch) {
    throw new Error("تاریخ معتبر نیست.");
  }

  const rawTime = latinDigits(time.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(rawTime);
  if (!timeMatch) {
    throw new Error("ساعت معتبر نیست.");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? "0");

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    throw new Error("تاریخ یا ساعت خارج از بازه مجاز است.");
  }

  const utcMs =
    Date.UTC(year, month - 1, day, hours, minutes, seconds) - TEHRAN_OFFSET_MS;
  const value = new Date(utcMs);
  if (Number.isNaN(value.getTime())) {
    throw new Error("تاریخ یا ساعت معتبر نیست.");
  }
  return value;
}

/** A calendar day with no clock. Noon UTC stays on this date in Tehran and UTC. */
export function calendarDateUtc(iso: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(latinDigits(iso.trim()));
  if (!dateMatch) {
    throw new Error("تاریخ معتبر نیست.");
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("تاریخ خارج از بازه مجاز است.");
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function tehranDateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function tehranTimeInputValue(date?: Date | null) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TEHRAN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  let hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );
  // Some engines report midnight as 24 with hour12:false.
  if (hour === 24) hour = 0;
  return `${pad(hour)}:${pad(minute)}`;
}

export const faTehranDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TEHRAN_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
});

export const faTehranDateShortFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TEHRAN_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric"
});

export const faTehranTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit"
});

export const faTehranDayFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TEHRAN_TIME_ZONE
});
