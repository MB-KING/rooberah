"use client";

import {
  Award,
  CalendarDays,
  Images,
  LayoutDashboard,
  MoreHorizontal,
  ScrollText,
  Settings,
  Tags,
  Send,
  Users,
  X
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { miniAppWidthClass } from "@/components/user/mini-app";

const primaryItems = [
  { href: "/admin", label: "داشبورد", Icon: LayoutDashboard, superOnly: false },
  {
    href: "/admin/events",
    label: "برنامه‌ها",
    Icon: CalendarDays,
    superOnly: false
  },
  { href: "/admin/users", label: "اعضا", Icon: Users, superOnly: true }
] as const;

const moreItems = [
  { href: "/admin/moderation", label: "نظر و عکس", Icon: Images },
  { href: "/admin/badges", label: "نشان‌ها", Icon: Award },
  { href: "/admin/categories", label: "حوزه کاری", Icon: Tags },
  { href: "/admin/telegram", label: "تلگرام", Icon: Send },
  { href: "/admin/activity", label: "فعالیت", Icon: ScrollText },
  { href: "/admin/settings", label: "تنظیمات", Icon: Settings }
] as const;

function pathActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = primaryItems.filter((item) => isSuperAdmin || !item.superOnly);
  const moreActive = moreItems.some((item) => pathActive(pathname, item.href));
  const cols = tabs.length + (isSuperAdmin ? 1 : 0);

  return (
    <>
      {moreOpen && isSuperAdmin ? (
        <div
          className={cn(
            "fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-full -translate-x-1/2 px-3",
            miniAppWidthClass
          )}
        >
          <div className="rounded-2xl border border-white/10 bg-[#21120A] p-2 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <p className="text-xs font-bold text-slate-400">بخش‌های بیشتر</p>
              <button
                type="button"
                aria-label="بستن"
                onClick={() => setMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(({ href, label, Icon }) => {
                const active = pathActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href as Route}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-bold",
                      active
                        ? "bg-[#F39C12] text-[#1C1008]"
                        : "bg-white/[0.06] text-slate-200"
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="منوی مدیریت"
        className={cn(
          "fixed bottom-0 left-1/2 z-50 -translate-x-1/2 border-t border-white/10 bg-[#21120A]/95 px-2 pt-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl",
          "pb-[calc(0.45rem+env(safe-area-inset-bottom))]",
          miniAppWidthClass
        )}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {tabs.map(({ href, label, Icon }) => {
            const active = pathActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold leading-tight transition active:scale-95",
                  active
                    ? "bg-[#F39C12] text-[#1C1008]"
                    : "text-slate-400 active:bg-white/[0.07] active:text-white"
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
          {isSuperAdmin ? (
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label="بخش‌های بیشتر"
              onClick={() => setMoreOpen((value) => !value)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold leading-tight transition active:scale-95",
                moreOpen || moreActive
                  ? "bg-[#F39C12] text-[#1C1008]"
                  : "text-slate-400 active:bg-white/[0.07] active:text-white"
              )}
            >
              <MoreHorizontal size={18} strokeWidth={moreOpen || moreActive ? 2.5 : 2} />
              <span>بیشتر</span>
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
