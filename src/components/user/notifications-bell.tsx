import { Bell } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOptionalCurrentUser } from "@/modules/auth/session";

export async function NotificationsBell() {
  const user = await getOptionalCurrentUser();
  if (!user) {
    return null;
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null }
  });

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `اعلان‌ها، ${unreadCount} خوانده‌نشده`
          : "اعلان‌ها"
      }
      className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition duration-200 active:scale-95 hover:border-sky-400/40 hover:text-white"
    >
      <Bell size={18} aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-400 px-1 text-[10px] font-black text-ink">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
