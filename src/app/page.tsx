import { Role, BadgeType, EventStatus } from "@prisma/client";
import {
  Award,
  ChevronLeft,
  History,
  LayoutDashboard,
  Settings,
  Trophy,
  UsersRound
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { GuestHome } from "@/components/user/guest-home";
import { NotificationsBell } from "@/components/user/notifications-bell";
import { UserAvatar } from "@/components/user/user-avatar";
import { ProfileProgressCard } from "@/components/user/profile-progress";
import { UserCard } from "@/components/user/user-card";
import { WorkStatusBadge } from "@/components/user/work-status-badge";
import {
  secondaryActionClass,
  secondaryActionInlineClass,
  UserPageShell
} from "@/components/user/user-shell";
import { formatFaNumber, formatJalaliPretty } from "@/lib/jalali";
import { getProfileProgress } from "@/shared/profile-progress";
import { formatSteps } from "@/shared/steps";
import { workStatusTone } from "@/shared/work-status";
import { defaultCommunitySlug } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/modules/auth/authorization";
import { BadgeService } from "@/modules/gamification/badge.service";
import { getOptionalCurrentUser } from "@/modules/auth/session";
import { formatAppVersion } from "@/shared/app-version";
import { APP_NAME, APP_SLOGAN } from "@/shared/brand";
import { MembershipGateAlert } from "@/components/user/membership-gate-alert";
import { getMissingRequiredMemberships } from "@/modules/telegram/membership-gate";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const currentUser = await getOptionalCurrentUser();
  const { profile: profileSaved } = await searchParams;
  if (currentUser) {
    await new BadgeService().syncCommunityRoleBadges(currentUser.communityId);
  }

  const community = await prisma.community.findFirst({
    where: currentUser
      ? { id: currentUser.communityId }
      : { slug: defaultCommunitySlug, isActive: true },
    select: { name: true, tagline: true }
  });

  const canOpenAdmin = currentUser
    ? hasAnyRole(currentUser, [Role.ADMIN, Role.SUPER_ADMIN])
    : false;

  const upcomingEvents = currentUser
    ? []
    : await prisma.event.findMany({
        where: {
          status: {
            in: [EventStatus.PUBLISHED, EventStatus.REGISTRATION_CLOSED]
          },
          deletedAt: null,
          date: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        },
        orderBy: { date: "asc" },
        take: 3,
        include: {
          _count: {
            select: { registrations: { where: { status: "REGISTERED" } } }
          }
        }
      });

  const [user, badges] = currentUser
    ? await Promise.all([
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
            xpTransactions: { orderBy: { createdAt: "desc" }, take: 5 },
            _count: {
              select: {
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
        })
      ])
    : [null, []] as const;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      `عضو ${APP_NAME}`
    : "";
  const attendanceCount = user?._count.attendance ?? 0;
  const profileChips = [
    user?.workCategory?.name,
    user?.profile?.businessName?.trim() || null
  ].filter((item): item is string => Boolean(item));
  const profileSkills = (user?.profile?.skills ?? "")
    .split(/[,،]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const profileProgress = user ? getProfileProgress(user) : null;
  const missingMemberships = currentUser
    ? await getMissingRequiredMemberships({
        communityId: currentUser.communityId,
        userId: currentUser.id,
        telegramId: currentUser.telegramId
      })
    : [];
  const earnedBadgeIds = new Set(user?.badges.map((item) => item.badgeId) ?? []);
  const nextBadges = badges
    .filter((badge) => !earnedBadgeIds.has(badge.id))
    .slice(0, 3)
    .map((badge) => {
      const currentValue =
        badge.type === BadgeType.ATTENDANCE_COUNT
          ? attendanceCount
          : badge.type === BadgeType.XP
            ? (user?.xp ?? 0)
            : 0;
      const progress = Math.min(
        100,
        Math.round((currentValue / Math.max(badge.threshold, 1)) * 100)
      );
      return {
        id: badge.id,
        name: badge.name,
        progress,
        type: badge.type,
        current: currentValue,
        threshold: badge.threshold
      };
    });

  return (
    <UserPageShell>
      <header className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-pine">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={72} priority />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black text-white">
                  {community?.name ?? APP_NAME}
                </h1>
                <p className="mt-1 text-sm font-bold text-ember">
                  {community?.tagline ?? APP_SLOGAN}
                </p>
              </div>
            </div>
            <NotificationsBell />
          </div>
          {canOpenAdmin ? (
            <Link className={`${secondaryActionClass} mt-4`} href="/admin">
              <LayoutDashboard size={16} aria-hidden="true" />
              پنل مدیریت
            </Link>
          ) : null}
        </div>
        <div className="h-1.5 w-full bg-gradient-to-l from-brand-red via-ember to-gold" />
      </header>

      {profileSaved === "saved" ? (
        <UserCard className="mb-4 border-ember/25 bg-ember/10">
          <p className="text-sm font-bold text-ember">پروفایل ذخیره شد.</p>
        </UserCard>
      ) : null}

      {user ? <MembershipGateAlert missing={missingMemberships} /> : null}

      {user ? (
        <>
          <UserCard
            className={workStatusTone(user.profile?.workStatus)?.card}
          >
            <div className="flex items-start gap-3">
              <UserAvatar photoUrl={user.photoUrl} name={displayName} size={56} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-black text-white">
                  {displayName}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-400" dir="ltr">
                  @{user.username ?? "بدون نام کاربری"}
                </p>
                {user.profile?.showWorkStatus !== false ||
                profileChips.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.profile?.showWorkStatus !== false ? (
                      <WorkStatusBadge status={user.profile?.workStatus} />
                    ) : null}
                    {profileChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-slate-300"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
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
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {user.profile.bio}
              </p>
            ) : null}
            {profileSkills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profileSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            {user.profile?.birthDate ? (
              <p className="mt-3 text-xs font-bold text-slate-400">
                تولد {formatJalaliPretty(user.profile.birthDate)}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
              <span className="text-white">{formatSteps(user.xp)}</span>
              <span>
                <span className="text-white">
                  {attendanceCount.toLocaleString("fa-IR")}
                </span>{" "}
                حضور
              </span>
              <span>
                <span className="text-white">
                  {user._count.badges.toLocaleString("fa-IR")}
                </span>{" "}
                نشان
              </span>
            </div>
          </UserCard>

          {profileProgress ? (
            <ProfileProgressCard progress={profileProgress} />
          ) : null}

          <div className="mt-4 grid gap-2">
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-black text-white">
                <Trophy size={18} className="text-ember" />
                نشان‌ها
              </h2>
              {user.badges.length > 0 ? (
                <span className="text-xs font-bold text-slate-400">
                  {formatFaNumber(user.badges.length)} گرفته‌شده
                </span>
              ) : null}
            </div>
            {user.badges.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                با اولین حضور، اولین نشانت می‌آید.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.badges.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200"
                  >
                    {item.badge.name}
                  </span>
                ))}
              </div>
            )}
            {nextBadges.length > 0 ? (
              <ul className="mt-3 grid gap-2.5 border-t border-white/10 pt-3">
                {nextBadges.map((badge) => (
                  <li key={badge.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Award
                          size={14}
                          className="shrink-0 text-ember"
                          aria-hidden="true"
                        />
                        <h3 className="truncate text-sm font-black text-white">
                          {badge.name}
                        </h3>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">
                        {nextBadgeNeedLabel(badge)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-gold to-ember"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : user.badges.length > 0 ? (
              <p className="mt-3 text-xs font-bold text-slate-400">
                همه نشان‌های فعال را گرفته‌ای.
              </p>
            ) : null}
          </UserCard>

          <UserCard className="mt-4">
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
        </>
      ) : (
        <GuestHome upcoming={upcomingEvents} />
      )}

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

function nextBadgeNeedLabel(badge: {
  type: BadgeType;
  current: number;
  threshold: number;
}) {
  if (badge.type === BadgeType.SPECIAL) return "ویژه";
  const unit = badge.type === BadgeType.XP ? "امتیاز" : "حضور";
  return `${formatFaNumber(badge.current)} از ${formatFaNumber(badge.threshold)} ${unit}`;
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

