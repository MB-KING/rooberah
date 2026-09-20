import { ExternalLink, Megaphone, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { UserCard } from "@/components/user/user-card";
import type { RequiredTelegramResource } from "@/modules/telegram/membership-gate";

export function MembershipGateAlert({
  missing,
  refreshHref = "/"
}: {
  missing: RequiredTelegramResource[];
  refreshHref?: string;
}) {
  if (missing.length === 0) {
    return null;
  }

  return (
    <UserCard className="mb-4 border-ember/40 bg-ember/10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
          <ShieldAlert size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p role="alert" className="text-sm font-black text-ember">
            عضویت اجباری
          </p>
          <p className="mt-1 text-sm leading-7 text-slate-200">
            برای ثبت‌نام در برنامه‌ها باید عضو کانال و گروه رسمی باشی.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {missing.map((resource) => (
          <a
            key={resource.id}
            href={resource.link}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1C1008]/60 px-3 text-sm font-bold text-white"
          >
            <span className="flex min-w-0 items-center gap-2">
              {resource.type === "CHANNEL" ? (
                <Megaphone size={16} className="shrink-0 text-ember" />
              ) : (
                <UsersRound size={16} className="shrink-0 text-ember" />
              )}
              <span className="truncate">{resource.name}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-ember">
              عضویت
              <ExternalLink size={14} aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
      <Link
        href={refreshHref as Route}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-ember/30 text-sm font-bold text-ember"
      >
        عضو شدم، دوباره بررسی کن
      </Link>
    </UserCard>
  );
}
