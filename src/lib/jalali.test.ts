import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import { describe, expect, it } from "vitest";
import { formatFaNumber, formatJalaliPretty } from "@/lib/jalali";
import { calendarDateUtc } from "@/lib/tehran-time";
import { meetingTimeFromStart } from "@/shared/event-timing";

describe("jalali display", () => {
  it("formats 21 March 2026 as 1 Farvardin 1405", () => {
    expect(formatJalaliPretty("2026-03-21")).toBe("۱ فروردین ۱۴۰۵");
  });

  it("uses Persian digits", () => {
    expect(formatFaNumber(1405)).toBe("۱۴۰۵");
  });
});

describe("birth date round trip", () => {
  it("keeps 29 Tir after a date-only save", () => {
    const picked = new DateObject({
      calendar: persian,
      year: 1366,
      month: 4,
      day: 29
    });
    const gregorianDate = new DateObject(picked).convert(gregorian);
    const iso = `${gregorianDate.year}-${String(gregorianDate.month.number).padStart(2, "0")}-${String(gregorianDate.day).padStart(2, "0")}`;
    const stored = calendarDateUtc(iso);
    const readBack = new Date(
      Date.UTC(
        stored.getUTCFullYear(),
        stored.getUTCMonth(),
        stored.getUTCDate()
      )
    );
    const label = formatJalaliPretty(readBack);
    expect(label).toContain("۲۹");
    expect(label).toContain("تیر");
  });
});

describe("meetingTimeFromStart", () => {
  it("is 15 minutes earlier", () => {
    const start = new Date("2026-08-10T10:00:00");
    expect(meetingTimeFromStart(start).toISOString()).toBe(
      new Date("2026-08-10T09:45:00").toISOString()
    );
  });
});
