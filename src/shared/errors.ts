export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "EVENT_NOT_FOUND"
  | "ALREADY_REGISTERED"
  | "REGISTRATION_CLOSED"
  | "MEMBERSHIP_REQUIRED"
  | "REGISTRATION_NOT_FOUND"
  | "ATTENDANCE_ALREADY_VERIFIED"
  | "NOT_ELIGIBLE_FOR_REWARD"
  | "REWARD_OUT_OF_STOCK"
  | "NOT_FOUND"
  | "FEEDBACK_NOT_ALLOWED"
  | "PHOTO_LIMIT_REACHED"
  | "UNEXPECTED_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export const errorMessagesFa: Record<ErrorCode, string> = {
  UNAUTHORIZED: "برای ادامه با تلگرام وارد شو.",
  FORBIDDEN: "به این بخش دسترسی نداری.",
  VALIDATION_ERROR: "اطلاعات واردشده کامل یا معتبر نیست.",
  EVENT_NOT_FOUND: "این برنامه پیدا نشد.",
  ALREADY_REGISTERED: "قبلا برای این برنامه ثبت‌نام کرده‌ای.",
  REGISTRATION_CLOSED: "ثبت‌نام این برنامه بسته شده است.",
  MEMBERSHIP_REQUIRED: "اول باید عضو کانال و گروه رسمی بشوی تا بتوانی ثبت‌نام کنی.",
  REGISTRATION_NOT_FOUND: "ثبت‌نام فعالی برای این برنامه پیدا نشد.",
  ATTENDANCE_ALREADY_VERIFIED: "حضور این عضو قبلا بررسی شده است.",
  NOT_ELIGIBLE_FOR_REWARD: "هنوز شرایط دریافت این مزیت را نداری.",
  REWARD_OUT_OF_STOCK: "ظرفیت این مزیت تکمیل شده است.",
  NOT_FOUND: "مورد درخواستی پیدا نشد.",
  FEEDBACK_NOT_ALLOWED:
    "فقط بعد از اتمام برنامه و حضور تأییدشده می‌توانی نظر یا عکس بفرستی.",
  PHOTO_LIMIT_REACHED: "برای این برنامه بیشتر از این تعداد عکس نمی‌توانی بفرستی.",
  UNEXPECTED_ERROR: "خطای غیرمنتظره رخ داد. دوباره تلاش کن."
};
