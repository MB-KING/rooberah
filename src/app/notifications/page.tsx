import {
  Bell,
  CalendarDays,
  CheckCheck,
  Gift,
  Sparkles,
  Trophy
} from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/app/actions";
import { EmptyState } from "@/components/user/empty-state";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import {
  secondaryActionClass,
  UserPageShell
} from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserPage } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export default async function NotificationsPage() {
  const user = await requireCurrentUserPage();
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null }
    })
  ]);

  return (
    <UserPageShell width="narrow">
        <UserPageHeader
          title="اعلان‌ها"
          subtitle="وضعیت ثبت‌نام و حضور."
          backFallbackHref="/"
        />

        <UserCard className="mb-4 border-ember/25 bg-pine">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
                <Bell size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-white">صندوق اعلان‌ها</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {unreadCount > 0
                    ? `${unreadCount} اعلان خوانده‌نشده داری.`
                    : "همه اعلان‌ها را خوانده‌ای."}
                </p>
              </div>
            </div>
            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <PendingSubmitButton
                  className={secondaryActionClass}
                  pendingLabel="در حال به‌روزرسانی…"
                  idleIcon={<CheckCheck size={16} aria-hidden="true" />}
                >
                  همه را خواندم
                </PendingSubmitButton>
              </form>
            ) : null}
          </div>
        </UserCard>

        <div className="grid gap-2">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="هنوز اعلانی نداری"
              description="وقتی ثبت‌نامت قطعی شود، حضورت تأیید شود یا مزیتی بگیری، اینجا خبرش می‌آید."
            />
          ) : (
            notifications.map((notification) => {
              const Icon = iconForType(notification.type);
              const unread = !notification.readAt;

              return (
                <article
                  key={notification.id}
                  className={
                    unread
                      ? "rounded-xl border border-sky-400/30 bg-sky-400/10 p-4"
                      : "rounded-xl border border-white/10 bg-pine/75 p-4"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        unread
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300"
                      }
                    >
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-white">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm leading-7 text-slate-300">
                            {notification.body}
                          </p>
                        </div>
                        <time
                          dateTime={notification.createdAt.toISOString()}
                          className="shrink-0 text-xs text-slate-400"
                        >
                          {dateFormatter.format(notification.createdAt)}
                        </time>
                      </div>
                      {unread ? (
                        <form
                          action={markNotificationReadAction}
                          className="mt-3"
                        >
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.id}
                          />
                          <PendingSubmitButton
                            className="min-h-11 rounded-lg bg-transparent px-2 text-sm font-bold text-sky-300 shadow-none hover:text-sky-200"
                            pendingLabel="…"
                          >
                            خواندم
                          </PendingSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
    </UserPageShell>
  );
}

function iconForType(type: string) {
  if (
    type.includes("REGISTRATION") ||
    type.includes("WAITLIST") ||
    type.includes("ATTEND")
  ) {
    return CalendarDays;
  }
  if (type.includes("REWARD") || type.includes("REDEMPTION")) {
    return Gift;
  }
  if (type.includes("BADGE")) {
    return Trophy;
  }
  return Sparkles;
}
