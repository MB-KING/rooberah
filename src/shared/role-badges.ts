import { APP_NAME } from "@/shared/brand";

export const ROLE_BADGES = {
  host: {
    slug: "gardanandeh",
    name: "گرداننده",
    description: `برگزارکننده برنامه‌های ${APP_NAME}`
  },
  lead: {
    slug: "rahbar",
    name: "راهبر",
    description: `راهبر جامعه ${APP_NAME}`
  }
} as const;
