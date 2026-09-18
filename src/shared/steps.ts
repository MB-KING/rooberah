import { XPTransactionType } from "@prisma/client";

/**
 * حضور واحد اصلی امتیاز است. فعالیت‌های جانبی نباید از یک برنامه جلو بزنند.
 * ATTEND_EVENT = 100
 */
export const defaultStepRules: Partial<Record<XPTransactionType, number>> = {
  ATTEND_EVENT: 100,
  ATTEND_SPECIAL_EVENT: 140,
  COMPLETE_PROFILE: 20,
  REFER_USER: 20,
  CREATE_REWARD: 30,
  EVENT_PHOTO: 10
};

export const earnStepTypes: XPTransactionType[] = [
  XPTransactionType.ATTEND_EVENT,
  XPTransactionType.REFER_USER,
  XPTransactionType.CREATE_REWARD,
  XPTransactionType.COMPLETE_PROFILE,
  XPTransactionType.ATTEND_SPECIAL_EVENT,
  XPTransactionType.EVENT_PHOTO
];

export const stepTypeLabels: Record<XPTransactionType, string> = {
  ATTEND_EVENT: "حضور در برنامه",
  REFER_USER: "دعوت همراه",
  CREATE_REWARD: "ایجاد مزیت",
  COMPLETE_PROFILE: "تکمیل پروفایل",
  ATTEND_SPECIAL_EVENT: "حضور در برنامه ویژه",
  EVENT_PHOTO: "عکس تأییدشده برنامه",
  SPEND_REWARD: "خرج برای مزیت",
  ADMIN_ADJUSTMENT: "تنظیم ادمین"
};

export function formatSteps(amount: number) {
  return `${amount.toLocaleString("fa-IR")} امتیاز`;
}
