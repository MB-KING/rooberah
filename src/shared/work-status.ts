export const WORK_STATUSES = [
  "HIRING",
  "OPEN_TO_WORK",
  "OPEN_TO_TEAM",
  "FREELANCE",
  "NOT_AVAILABLE"
] as const;

export type WorkStatusValue = (typeof WORK_STATUSES)[number];

export const WORK_STATUS_OPTIONS: Array<{
  value: WorkStatusValue;
  label: string;
}> = [
  { value: "HIRING", label: "در حال استخدام" },
  { value: "OPEN_TO_WORK", label: "جویای کار" },
  { value: "OPEN_TO_TEAM", label: "آماده کار تیمی" },
  { value: "FREELANCE", label: "فریلنس" },
  { value: "NOT_AVAILABLE", label: "فعلاً مشغولم" }
];

export function parseWorkStatus(
  value: string | null | undefined
): WorkStatusValue | null {
  if (!value) return null;
  return WORK_STATUSES.includes(value as WorkStatusValue)
    ? (value as WorkStatusValue)
    : null;
}

export function workStatusLabel(
  status: WorkStatusValue | string | null | undefined
) {
  if (!status) return null;
  return WORK_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? null;
}
