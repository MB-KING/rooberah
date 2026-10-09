import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import { describe, expect, it } from "vitest";
import {
  formatJalaliDisplay,
  formatJalaliPretty,
  gregorianIsoFromJalali,
  jalaliFromGregorianIso,
  toGregorian,
  toJalali
} from "@/lib/jalali";
import { calendarDateUtc } from "@/lib/tehran-time";
import { meetingTimeFromStart } from "@/shared/event-timing";

describe("jalali conversion", () => {
  it("round-trips a known date", () => {
    const j = toJalali(2026, 3, 21);
    expect(j).toEqual({ jy: 1405, jm: 1, jd: 1 });
    const g = toGregorian(j.jy, j.jm, j.jd);
    expect(g).toEqual({ gy: 2026, gm: 3, gd: 21 });
    expect(gregorianIsoFromJalali(j)).toBe("2026-03-21");
    expect(jalaliFromGregorianIso("2026-03-21")).toEqual(j);
    expect(formatJalaliDisplay(j)).toBe("1405/01/01");
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
