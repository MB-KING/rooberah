import type { Route } from "next";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/cn";
import { BackButton } from "@/components/user/back-button";
import { NotificationsBell } from "@/components/user/notifications-bell";

export function UserCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-pine/75 p-4 shadow-sm shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export async function UserPageHeader({
  title,
  subtitle,
  showBack = true,
  backFallbackHref = "/"
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backFallbackHref?: Route;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-center gap-3">
        {showBack ? <BackButton fallbackHref={backFallbackHref} /> : null}
        <BrandMark size={36} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <NotificationsBell />
      </div>
    </header>
  );
}
