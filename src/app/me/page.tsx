import {
  Award,
  Bell,
  CheckCircle2,
  ChevronLeft,
  History,
  Settings,
  Trophy,
  UsersRound
} from "lucide-react";
import { BadgeType } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { WorkStatusBadge } from "@/components/user/work-status-badge";
import {
  secondaryActionInlineClass,
  UserPageShell
} from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/shared/brand";
import { requireCurrentUserPage } from "@/modules/auth/session";
import { formatAppVersion } from "@/shared/app-version";
import { labelOf, registrationStatusLabels } from "@/shared/labels";

export const dynamic = "force-dynamic";

export default async function MePage({
  searchParams
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const currentUser = await requireCurrentUserPage();
  const { profile: profileSaved } = await searchParams;
  const [user, badges, unreadNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        profile: true,
        workCategory: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
          take: 5
        },
        registrations: {
          include: { event: true },
          orderBy: { registeredAt: "desc" },
          take: 3
        },
        attendance: {
          where: { status: "PRESENT" },
          include: { event: true },
          orderBy: { verifiedAt: "desc" },
          take: 3
        },
        xpTransactions: { orderBy: { createdAt: "desc" }, take: 5 },
        _count: {
          select: {
            registrations: true,
            attendance: { where: { status: "PRESENT" } },
            badges: true
          }
        }
      }
    }),
    prisma.badge.findMany({
      where: { communityId: currentUser.communityId, isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { threshold: "asc" },
        { createdAt: "asc" }
      ]
    }),
    prisma.notification.count({
      where: { userId: currentUser.id, readAt: null }
    })
  ]);

  if (!user) {
    return null;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    `عضو ${APP_NAME}`;
  const earnedBadgeIds = new Set(user.badges.map((item) => item.badgeId));
  const attendanceCount = user._count.attendance;

  const nextBadges = badges
    .filter((badge) => !earnedBadgeIds.has(badge.id))
    .slice(0, 3)
    .map((badge) => {
      const currentValue =
        badge.type === BadgeType.ATTENDANCE_COUNT
          ? attendanceCount
          : badge.type === BadgeType.XP
            ? user.xp
            : 0;
      const remaining = Math.max(badge.threshold - currentValue, 0);
      const progress = Math.min(
        100,
        Math.round((currentValue / Math.max(badge.threshold, 1)) * 100)
      );
      return {
        id: badge.id,
        name: badge.name,
        remaining,
        progress,
        type: badge.type
      };
    });

  return (
    <UserPageShell>
      <UserPageHeader
        title="پروفایل من"
        subtitle="امتیاز، نشان و حضورهای تو."
        showBack={false}
      />

      {profileSaved === "saved" ? (
        <UserCard className="mb-4 border-ember/25 bg-ember/10">
          <p className="text-sm font-bold text-ember">پروفایل ذخیره شد.</p>
        </UserCard>
      ) : null}

      <UserCard>
        <div className="flex items-center gap-3">
          <UserAvatar photoUrl={user.photoUrl} name={displayName} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black text-white">
              {displayName}
            </h2>
            <p className="truncate text-sm text-slate-400" dir="ltr">
              @{user.username ?? "بدون نام کاربری"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {user.profile?.showWorkStatus !== false ? (
                <WorkStatusBadge status={user.profile?.workStatus} />
              ) : null}
              {user.workCategory ? (
                <span className="text-xs font-bold text-ember">
                  {user.workCategory.name}
                </span>
              ) : null}
            </div>
            {user.profile?.businessName ? (
              <p className="mt-1 truncate text-sm text-slate-300">
                {user.profile.businessName}
              </p>
            ) : null}
          </div>
          <Link
            href="/me/settings"
            className={secondaryActionInlineClass}
            aria-label="ویرایش پروفایل"
          >
            <Settings size={16} aria-hidden="true" />
          </Link>
        </div>
        {user.profile?.bio ? (
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {user.profile.bio}
          </p>
        ) : null}
        {user.profile?.skills ? (
          <p className="mt-3 text-sm text-slate-300">
            <span className="font-bold text-ember">مهارت‌ها: </span>
            {user.profile.skills}
          </p>
        ) : null}
        <Link
          href="/me/settings"
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-ember"
        >
          ویرایش پروفایل
        </Link>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="امتیاز" value={user.xp} />
          <Metric label="حضور" value={attendanceCount} />
          <Metric label="نشان" value={user._count.badges} />
        </div>
      </UserCard>

      <div className="mt-4 grid gap-2">
        <Link
          href="/notifications"
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-pine/75 p-4 transition duration-200 active:scale-[0.99] hover:border-sky-400/40"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
              <Bell size={20} aria-hidden="true" />
              {unreadNotifications > 0 ? (
                <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-400 px-1 text-[10px] font-black text-ink">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </div>
            <div>
              <h2 className="font-black text-white">اعلان‌ها</h2>
              <p className="mt-1 text-sm text-slate-400">
                {unreadNotifications > 0
                  ? `${unreadNotifications} خوانده‌نشده`
                  : "همه خوانده شده"}
              </p>
            </div>
          </div>
          <ChevronLeft size={18} className="text-slate-400" aria-hidden="true" />
        </Link>
        <Link
          href={"/community" as Route}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-pine/75 p-4 transition duration-200 active:scale-[0.99] hover:border-ember/35"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember/15 text-ember">
              <UsersRound size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-black text-white">گروه و کانال</h2>
              <p className="mt-1 text-sm text-slate-400">منابع رسمی تلگرام</p>
            </div>
          </div>
          <ChevronLeft size={18} className="text-slate-400" aria-hidden="true" />
        </Link>
      </div>

      <UserCard className="mt-4">
        <h2 className="flex items-center gap-2 font-black text-white">
          <Trophy size={18} className="text-ember" />
          نشان‌های بعدی
        </h2>
        <div className="mt-4 grid gap-3">
          {nextBadges.length === 0 ? (
            <p className="text-sm text-slate-300">
              همه نشان‌های فعال را گرفته‌ای یا نشانی فعال نیست.
            </p>
          ) : (
            nextBadges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-white/10 bg-white/[0.06] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-ember" />
                    <h3 className="font-black text-white">{badge.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-ember">
                    {badge.type === BadgeType.SPECIAL
                      ? "ویژه"
                      : badge.type === BadgeType.XP
                        ? `${badge.remaining} امتیاز`
                        : `${badge.remaining} حضور`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-ember"
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </UserCard>

      <section className="mt-4 grid gap-4">
        <SummaryCard
          title="برنامه‌های من"
          total={user._count.registrations}
          items={user.registrations.map((item) => ({
            id: item.id,
            href: `/events/${item.event.id}`,
            text: `${item.event.title} - ${labelOf(registrationStatusLabels, item.status)}`
          }))}
          empty="هنوز ثبت‌نامی نداری."
        />
        <SummaryCard
          title="حضورهای تأییدشده"
          total={user._count.attendance}
          items={user.attendance.map((item) => ({
            id: item.id,
            href: `/events/${item.event.id}`,
            text: item.event.title
          }))}
          empty="هنوز حضور تأییدشده‌ای نداری."
        />
        <SummaryCard
          title="نشان‌های گرفته‌شده"
          icon={<CheckCircle2 size={18} className="text-emerald-300" />}
          total={user._count.badges}
          items={user.badges.map((item) => ({
            id: item.id,
            text: item.badge.name
          }))}
          empty="با اولین حضور، اولین نشانت می‌آید."
        />
        <UserCard>
          <h2 className="mb-3 flex items-center gap-2 font-black text-white">
            <History size={18} className="text-ember" />
            آخرین امتیازها
          </h2>
          {user.xpTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">هنوز امتیازی ثبت نشده.</p>
          ) : (
            <ul className="grid gap-2">
              {user.xpTransactions.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 text-sm"
                >
                  <span className="text-slate-200">
                    {item.description ?? xpTypeLabel(item.type)}
                  </span>
                  <span className="font-black text-emerald-300">
                    +{item.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </UserCard>
      </section>

      <p className="mt-8 text-center">
        <Link
          href={"/me/changelog" as Route}
          aria-label={`تغییرات نسخه ${formatAppVersion()}`}
          className="text-[10px] font-medium text-slate-600 transition duration-200 hover:text-slate-500"
        >
          {formatAppVersion()}
        </Link>
      </p>
    </UserPageShell>
  );
}

function xpTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ATTEND_EVENT: "حضور در برنامه",
    REFER_USER: "دعوت همراه",
    COMPLETE_PROFILE: "تکمیل پروفایل",
    ATTEND_SPECIAL_EVENT: "حضور ویژه",
    EVENT_PHOTO: "عکس تأییدشده برنامه"
  };
  return labels[type] ?? "امتیاز فعالیت";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function SummaryCard({
  title,
  items,
  empty,
  total,
  icon
}: {
  title: string;
  items: Array<{ id: string; text: string; href?: string }>;
  empty: string;
  total: number;
  icon?: React.ReactNode;
}) {
  return (
    <UserCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-black text-white">
          {icon}
          {title}
        </h2>
        {total > items.length ? (
          <span className="text-xs font-bold text-slate-400">
            {items.length} از {total}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href as Route}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-200 transition duration-200"
                >
                  <span className="min-w-0 truncate">{item.text}</span>
                  <ChevronLeft
                    size={16}
                    className="shrink-0 text-ember"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div className="rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-200">
                  {item.text}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </UserCard>
  );
}
