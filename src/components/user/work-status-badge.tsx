import { workStatusLabel, type WorkStatusValue } from "@/shared/work-status";

export function WorkStatusBadge({
  status
}: {
  status: WorkStatusValue | string | null | undefined;
}) {
  const label = workStatusLabel(status);
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-ember/15 px-2.5 py-1 text-[11px] font-bold text-ember">
      {label}
    </span>
  );
}
