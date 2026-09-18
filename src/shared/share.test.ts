import { describe, expect, it } from "vitest";
import {
  eventShareCaption,
  eventShareDetailsText,
  eventShareTelegramCaption,
  eventShareText,
  linkedinShareUrl,
  twitterShareUrl
} from "@/shared/share";

describe("event share copy", () => {
  const details = {
    title: "تست",
    dateLabel: "سه‌شنبه ۲۴ مرداد ۱۴۰۴",
    meetingTime: "۱۹:۴۵",
    startTime: "۲۰:۱۵",
    locationName: "پردیسان",
    locationAddress: "بلوار جنوبی"
  };

  it("includes date, both times, place and address", () => {
    const text = eventShareDetailsText(details);
    expect(text).toContain("با رو به راه می‌رم برنامه «تست»");
    expect(text).toContain("سه‌شنبه ۲۴ مرداد ۱۴۰۴");
    expect(text).toContain("ساعت جمع شدن ۱۹:۴۵");
    expect(text).toContain("ساعت شروع مسیر ۲۰:۱۵");
    expect(text).toContain("پردیسان");
    expect(text).toContain("بلوار جنوبی");
  });

  it("says the person is going with رو به راه", () => {
    expect(eventShareText("تست")).toContain("با رو به راه می‌رم");
  });

  it("keeps the Telegram photo caption short without clocks or urls", () => {
    const caption = eventShareTelegramCaption("تست");
    expect(caption).toContain("با رو به راه می‌رم برنامه «تست»");
    expect(caption).toContain("اگر تو هم می‌آی");
    expect(caption).not.toContain("شما");
    expect(caption).not.toContain("۱۹:۴۵");
    expect(caption).not.toContain("http");
  });

  it("appends the referral url in the long caption", () => {
    const caption = eventShareCaption(
      details,
      "https://hammasir.mbking.info/events/1"
    );
    expect(caption).toContain("https://hammasir.mbking.info/events/1");
  });

  it("uses the same caption body for LinkedIn and X", () => {
    const text = eventShareDetailsText(details);
    const url = "https://rooberah.mbking.info/events/1";
    const linkedin = new URL(linkedinShareUrl(url, text));
    const twitter = new URL(twitterShareUrl(url, text));
    expect(linkedin.searchParams.get("text")).toContain("با رو به راه می‌رم");
    expect(linkedin.searchParams.get("text")).toContain(url);
    expect(twitter.searchParams.get("text")).toContain("با رو به راه می‌رم");
    expect(twitter.searchParams.get("text")).toContain("ساعت جمع شدن ۱۹:۴۵");
    expect(twitter.searchParams.get("text")).toContain(url);
  });
});
