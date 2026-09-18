import { cn } from "@/lib/cn";
import {
  visibleWorkStatus,
  workStatusLabel,
  workStatusTone
} from "@/shared/work-status";

export function WorkStatusBadge({
  status
}: {
  status: string | null | undefined;
}) {
  const visible = visibleWorkStatus(status);
  const label = workStatusLabel(visible);
  const tone = workStatusTone(visible);
  if (!label || !tone) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
        tone.chip
      )}
    >
      {label}
    </span>
  );
}
