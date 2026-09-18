import { readSocialLinks } from "@/shared/social-links";

export const PROFILE_PROGRESS_STEPS = [
  { key: "firstName", label: "نام" },
  { key: "lastName", label: "نام خانوادگی" },
  { key: "phone", label: "شماره تلفن" },
  { key: "birthDate", label: "تاریخ تولد" },
  { key: "bio", label: "درباره من" },
  { key: "businessName", label: "محل کار" },
  { key: "workCategory", label: "حوزه کاری" },
  { key: "workStatus", label: "وضعیت کاری" },
  { key: "skills", label: "مهارت‌ها" },
  { key: "social", label: "لینک‌ها" }
] as const;

export type ProfileProgressStepKey =
  (typeof PROFILE_PROGRESS_STEPS)[number]["key"];

export type ProfileProgressInput = {
  firstName?: string | null;
  lastName?: string | null;
  workCategoryId?: string | null;
  profile?: {
    phoneNumber?: string | null;
    birthDate?: Date | string | null;
    bio?: string | null;
    businessName?: string | null;
    workStatus?: string | null;
    skills?: string | null;
    socialLinks?: unknown;
  } | null;
};

function filled(value?: string | null) {
  return Boolean(value?.trim());
}

export function getProfileProgress(input: ProfileProgressInput) {
  const doneByKey: Record<ProfileProgressStepKey, boolean> = {
    firstName: filled(input.firstName),
    lastName: filled(input.lastName),
    phone: filled(input.profile?.phoneNumber),
    birthDate: Boolean(input.profile?.birthDate),
    bio: filled(input.profile?.bio),
    businessName: filled(input.profile?.businessName),
    workCategory: Boolean(input.workCategoryId),
    workStatus: Boolean(input.profile?.workStatus),
    skills: filled(input.profile?.skills),
    social: Object.keys(readSocialLinks(input.profile?.socialLinks)).length > 0
  };

  const steps = PROFILE_PROGRESS_STEPS.map((step) => ({
    ...step,
    done: doneByKey[step.key]
  }));
  const doneCount = steps.filter((step) => step.done).length;
  const total = steps.length;
  const missing = steps.filter((step) => !step.done);

  return {
    steps,
    doneCount,
    total,
    percent: Math.round((doneCount / total) * 100),
    missing,
    complete: missing.length === 0
  };
}
