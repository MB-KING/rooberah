import type { Route } from "next";
import { BrandMark } from "@/components/brand/brand-mark";
import { APP_TITLE } from "@/shared/brand";
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
    <header className="mb-5">
      <div className="flex items-start gap-3">
        {showBack ? <BackButton fallbackHref={backFallbackHref} /> : null}
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <BrandMark size={40} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ember">{APP_TITLE}</p>
            <h1 className="mt-1 break-words text-2xl font-black text-white">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-7 text-slate-300">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-0.5 shrink-0">
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
