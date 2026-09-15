import { eventStatusLabels, labelOf } from "@/shared/labels";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 py-1 text-xs font-bold text-[#FBBF24]">
      {labelOf(eventStatusLabels, status)}
    </span>
  );
}
