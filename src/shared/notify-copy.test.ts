import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/shared/brand";
import { MEETING_TIME_LABEL } from "@/shared/copy";
import {
  attendancePresentCopy,
  eventDayReminderCopy,
  eventTwoHourReminderCopy,
  feedbackInviteCopy,
  helpMessageLines,
  photoReviewedCopy,
  registrationConfirmedCopy,
  registrationWaitlistedCopy,
  rewardRedeemedCopy,
  specialBadgeCopy,
  startMessageLines,
  TELEGRAM_CAPTION_LIMIT,
  TELEGRAM_MESSAGE_LIMIT
} from "@/shared/notify-copy";
import {
  formatEventAnnounceHtml,
  formatHelpMessageHtml,
  formatNotificationHtml as formatTelegramNotificationHtml,
  formatStartMessageHtml
} from "@/lib/telegram-format";

describe("notify copy", () => {
  it("keeps brand and informal tone", () => {
    const texts = [
      ...startMessageLines(),
      ...helpMessageLines(),
      registrationConfirmedCopy("پیاده جمعه").body,
      registrationWaitlistedCopy("پیاده جمعه").body,
      eventDayReminderCopy({
        title: "پیاده جمعه",
        meetingTimeLabel: "۱۹:۴۵",
        locationName: "آب و آتش"
      }).body,
      feedbackInviteCopy("پیاده جمعه").body,
      specialBadgeCopy("راهبر").body
    ].join("\n");

    expect(texts).toContain(APP_NAME);
    expect(texts).toContain("پیاده جمعه");
    expect(texts).not.toContain("هم مسیر");
    expect(texts).not.toContain("شما");
    expect(texts).not.toContain("Ham Masir");
  });

  it("uses shared time labels in reminders", () => {
    const day = eventDayReminderCopy({
      title: "تست",
      meetingTimeLabel: "۱۹:۴۵",
      locationName: "پردیسان"
    });
    const twoHours = eventTwoHourReminderCopy({
      title: "تست",
      dateLabel: "جمعه",
      meetingTimeLabel: "۱۹:۴۵",
      locationName: "پردیسان"
    });
    expect(day.body).toContain(MEETING_TIME_LABEL);
    expect(day.body).toContain("۱۹:۴۵");
    expect(twoHours.body).toContain(MEETING_TIME_LABEL);
    expect(twoHours.title).toContain("دو ساعت");
  });

  it("mentions XP only when a photo actually earned it", () => {
    const withXp = photoReviewedCopy({
      eventTitle: "تست",
      approved: true,
      awardedXp: true
    });
    const withoutXp = photoReviewedCopy({
      eventTitle: "تست",
      approved: true,
      awardedXp: false
    });
    expect(withXp.body).toContain("امتیاز");
    expect(withoutXp.body).not.toContain("امتیاز");
  });

  it("includes reward codes when present", () => {
    expect(rewardRedeemedCopy("نوشیدنی", "ABC-1").body).toContain("ABC-1");
    expect(rewardRedeemedCopy("نوشیدنی").body).not.toContain("کد:");
  });

  it("tells present members they can send feedback after completion", () => {
    const done = attendancePresentCopy({
      eventTitle: "تست",
      eventCompleted: true
    });
    const live = attendancePresentCopy({
      eventTitle: "تست",
      eventCompleted: false
    });
    expect(done.body).toContain("حالا می‌توانی نظر و عکس");
    expect(live.body).toContain("بعد از اتمام برنامه");
  });
});

describe("telegram html formatters", () => {
  const event = {
    title: "۱۱۹امین برنامه پیاده روی گروهی",
    eventNumber: 119,
    date: new Date("2026-09-20T16:15:00.000Z"),
    meetingTime: new Date("2026-09-20T16:15:00.000Z"),
    startTime: new Date("2026-09-20T16:30:00.000Z"),
    locationName: "بوستان آب و آتش",
    description: "مسیر عصرگاهی برای دیدار و حرکت جمعی."
  };

  it("builds a group announce under the photo caption limit", () => {
    const html = formatEventAnnounceHtml(event);
    expect(html).toContain(`برنامه جدید ${APP_NAME}`);
    expect(html).toContain(event.title);
    expect(html).toContain(MEETING_TIME_LABEL);
    expect(html).toContain("ساعت شروع مسیر");
    expect(html).toContain("<b>");
    expect(html.length).toBeLessThanOrEqual(TELEGRAM_CAPTION_LIMIT);
    expect(html).not.toMatch(/<b>[^<]*$/);
  });

  it("escapes html in notification bodies", () => {
    const html = formatTelegramNotificationHtml(
      "ثبت‌نام <تست>",
      'متن با <script> و "نقل"'
    );
    expect(html).toContain("&lt;تست&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html.length).toBeLessThan(TELEGRAM_MESSAGE_LIMIT);
  });

  it("keeps start and help as valid html with the current brand", () => {
    const start = formatStartMessageHtml();
    const help = formatHelpMessageHtml();
    expect(start).toContain(`<b>به ${APP_NAME} خوش آمدی</b>`);
    expect(help).toContain(`<b>راهنمای ${APP_NAME}</b>`);
    expect(help).toContain("پروفایل و نشان");
    expect(start).not.toContain("هم مسیر");
    expect(help).not.toContain("هم مسیر");
  });
});
