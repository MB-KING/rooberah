"use client";

import { CalendarDays, Home, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { miniAppWidthClass } from "@/components/user/mini-app";

const items = [
  {
    href: "/",
    label: "خانه",
    Icon: Home,
    match: ["/", "/me", "/notifications", "/community"]
  },
  {
    href: "/events",
    label: "برنامه‌ها",
    Icon: CalendarDays,
    match: ["/events"]
  },
  {
    href: "/members",
    label: "همراهان",
    Icon: UsersRound,
    match: ["/members", "/leaderboard"]
  }
] as const;

function isActive(pathname: string, match: readonly string[]) {
  return match.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function UserNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="منوی اصلی"
      className={cn(
        "fixed bottom-0 left-1/2 z-50 -translate-x-1/2 border-t border-white/10 bg-night/95 px-2 pt-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        "pb-[calc(0.45rem+env(safe-area-inset-bottom))]",
        miniAppWidthClass
      )}
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ href, label, Icon, match }) => {
          const active = isActive(pathname, match);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold leading-tight transition duration-200 active:scale-95",
                active
                  ? "bg-ember text-ink shadow-sm shadow-ember/20"
                  : "text-slate-400 active:bg-white/[0.07] active:text-white"
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 2}
                className="shrink-0"
                aria-hidden="true"
              />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
