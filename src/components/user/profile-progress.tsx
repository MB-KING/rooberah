import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { UserCard } from "@/components/user/user-card";
import { formatFaNumber } from "@/lib/jalali";
import { cn } from "@/lib/cn";
import type { getProfileProgress } from "@/shared/profile-progress";

export function ProfileProgressCard({
  progress
}: {
  progress: ReturnType<typeof getProfileProgress>;
}) {
  const nextLabels = progress.missing
    .slice(0, 2)
    .map((step) => step.label)
    .join(" · ");

  return (
    <UserCard className="mt-4 border-ember/25">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-black text-white">
          {progress.complete ? (
            <CheckCircle2 size={18} className="text-emerald-300" />
          ) : (
            <Sparkles size={18} className="text-ember" />
          )}
          تکمیل پروفایل
        </h2>
        <span
          className={cn(
            "text-sm font-black",
            progress.complete ? "text-emerald-300" : "text-ember"
          )}
        >
          {formatFaNumber(progress.percent)}٪
        </span>
      </div>
      <div
        className="mt-3 flex gap-1"
        role="progressbar"
        aria-label="میزان تکمیل پروفایل"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        {progress.steps.map((step) => (
          <span
            key={step.key}
            title={step.label}
            className={cn(
              "h-2 flex-1 rounded-full",
              step.done
                ? "bg-gradient-to-l from-gold to-ember"
                : "bg-white/10"
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
        {progress.complete
          ? "همه بخش‌ها تکمیل شد"
          : `${formatFaNumber(progress.doneCount)} از ${formatFaNumber(progress.total)} بخش${
              nextLabels ? ` · بعدی: ${nextLabels}` : ""
            }`}
      </p>
      {progress.complete ? null : (
        <Link
          href="/me/settings"
          className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-ember text-sm font-black text-ink shadow-sm shadow-ember/20 transition duration-200 active:scale-[0.99] hover:bg-gold"
        >
          ادامه تکمیل
        </Link>
      )}
    </UserCard>
  );
}
