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

export const WORK_STATUS_TONES: Record<
  Exclude<WorkStatusValue, "NOT_AVAILABLE">,
  { chip: string; card: string }
> = {
  HIRING: {
    chip: "border-emerald-400/40 bg-emerald-500/25 text-emerald-100",
    card: "border-emerald-400/45 bg-emerald-950/55"
  },
  OPEN_TO_WORK: {
    chip: "border-sky-400/40 bg-sky-500/25 text-sky-100",
    card: "border-sky-400/45 bg-sky-950/50"
  },
  OPEN_TO_TEAM: {
    chip: "border-violet-400/40 bg-violet-500/25 text-violet-100",
    card: "border-violet-400/45 bg-violet-950/50"
  },
  FREELANCE: {
    chip: "border-amber-400/45 bg-amber-500/20 text-amber-100",
    card: "border-amber-400/45 bg-amber-950/45"
  }
};

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

export function isBusyWorkStatus(
  status: WorkStatusValue | string | null | undefined
) {
  return parseWorkStatus(status) === "NOT_AVAILABLE";
}

export function visibleWorkStatus(
  status: WorkStatusValue | string | null | undefined
): Exclude<WorkStatusValue, "NOT_AVAILABLE"> | null {
  const parsed = parseWorkStatus(status);
  if (!parsed || parsed === "NOT_AVAILABLE") return null;
  return parsed;
}

export function workStatusTone(
  status: WorkStatusValue | string | null | undefined
) {
  const visible = visibleWorkStatus(status);
  return visible ? WORK_STATUS_TONES[visible] : null;
}
