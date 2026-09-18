import type { Route } from "next";
import { APP_TITLE } from "@/shared/brand";
import { cn } from "@/lib/cn";
import { BackButton } from "@/components/user/back-button";

export function AdminCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.06] p-4 shadow-sm shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
  showBack = false,
  backFallbackHref = "/admin"
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBack?: boolean;
  backFallbackHref?: Route;
}) {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex items-start gap-3">
        {showBack ? <BackButton fallbackHref={backFallbackHref} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ember">{APP_TITLE} · ادمین</p>
          <h1 className="mt-1 break-words text-2xl font-black text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="w-full">{action}</div> : null}
    </div>
  );
}
