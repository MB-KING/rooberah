import { Trophy, UsersRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/user/empty-state";
import { MembersFilters } from "@/components/user/members-filters";
import { APP_NAME } from "@/shared/brand";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { WorkStatusBadge } from "@/components/user/work-status-badge";
import {
  secondaryActionClass,
  UserPageShell
} from "@/components/user/user-shell";
import { memberSearchOr } from "@/lib/member-search";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserPage } from "@/modules/auth/session";
import { BadgeService } from "@/modules/gamification/badge.service";
import { formatSteps } from "@/shared/steps";
import {
  parseWorkStatus,
  workStatusTone,
  WORK_STATUS_OPTIONS
} from "@/shared/work-status";

export const dynamic = "force-dynamic";

function buildMembersHref(input: {
  category?: string;
  status?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.status) params.set("status", input.status);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return (query ? `/members?${query}` : "/members") as Route;
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{
    category?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const currentUser = await requireCurrentUserPage();
  await new BadgeService().syncCommunityRoleBadges(currentUser.communityId);
  const {
    category,
    page: pageRaw,
    q: qRaw,
    status: statusRaw
  } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const status = parseWorkStatus(statusRaw);
  const page = Math.max(Number(pageRaw ?? 1) || 1, 1);
  const take = 20;
  const skip = (page - 1) * take;

  const listedWhere: Prisma.UserWhereInput = {
    communityId: currentUser.communityId,
    deletedAt: null,
    profile: {
      is: {
        showInMembersDirectory: true,
        ...(status ? { workStatus: status } : {})
      }
    },
    ...(category ? { workCategoryId: category } : {}),
    ...(q ? { OR: memberSearchOr(q) } : {})
  };

  const community = await prisma.community.findUnique({
    where: { id: currentUser.communityId },
    select: { leaderboardEnabled: true }
  });

  const [categories, total, members] = await Promise.all([
    prisma.workCategory.findMany({
      where: { communityId: currentUser.communityId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.user.count({
      where: listedWhere
    }),
    prisma.user.findMany({
      where: listedWhere,
      orderBy: [{ xp: "desc" }, { joinedAt: "asc" }],
      take,
      skip,
      include: {
        profile: true,
        workCategory: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
          take: 4
        },
        _count: { select: { attendance: { where: { status: "PRESENT" } } } },
        businessMemberships: {
          where: { business: { status: "APPROVED", deletedAt: null } },
          include: { business: true }
        }
      }
    })
  ]);

  let myRank: number | null = null;
  if (community?.leaderboardEnabled) {
    const better = await prisma.user.count({
      where: {
        communityId: currentUser.communityId,
        deletedAt: null,
        profile: { is: { showInMembersDirectory: true } },
        OR: [
          { xp: { gt: currentUser.xp } },
          { xp: currentUser.xp, joinedAt: { lt: currentUser.joinedAt } }
        ]
      }
    });
    myRank = better + 1;
  }

  const totalPages = Math.max(Math.ceil(total / take), 1);

  return (
    <UserPageShell>
      <UserPageHeader title="همراهان" backFallbackHref="/" />

      <MembersFilters
        q={q}
        category={category ?? ""}
        status={status ?? ""}
        categories={categories}
        statusOptions={WORK_STATUS_OPTIONS}
      />

      {myRank ? (
        <UserCard className="mb-4 border-ember/25 bg-pine !p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
              <Trophy size={18} aria-hidden="true" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-400">رتبه تو</p>
                <p className="mt-0.5 text-lg font-black leading-none text-white">
                  {myRank.toLocaleString("fa-IR")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">امتیاز</p>
                <p className="mt-0.5 text-lg font-black leading-none text-white">
                  {currentUser.xp.toLocaleString("fa-IR")}
                </p>
              </div>
            </div>
          </div>
        </UserCard>
      ) : null}

      <div className="grid gap-3">
        {members.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={
              q || status || category
                ? "کسی با این جستجو پیدا نشد"
                : "هنوز پروفایل عمومی وجود ندارد"
            }
            description={
              q || status || category
                ? "عبارت یا فیلتر را عوض کن و دوباره بگرد."
                : "از تنظیمات پروفایل می‌توانی خودت را در فهرست همراهان نشان بدهی."
            }
            action={
              <Link className={secondaryActionClass} href="/me/settings">
                تنظیمات پروفایل
              </Link>
            }
          />
        ) : (
          members.map((member, index) => {
            const name =
              [member.firstName, member.lastName].filter(Boolean).join(" ") ||
              member.username ||
              `عضو ${APP_NAME}`;
            const rank = skip + index + 1;
            const showWorkStatus = member.profile?.showWorkStatus !== false;
            const showBusiness = member.profile?.showBusiness !== false;
            const workplace = showBusiness
              ? member.profile?.businessName?.trim() || null
              : null;
            const statusTone = showWorkStatus
              ? workStatusTone(member.profile?.workStatus)
              : null;
            const workplaces = [
              workplace,
              ...(showBusiness
                ? member.businessMemberships.map(({ business }) => business.name)
                : [])
            ].filter((item, index, list): item is string =>
              Boolean(item && list.indexOf(item) === index)
            );
            const chips = [
              ...member.badges.map((item) => item.badge.name),
              member.profile?.showWorkCategory !== false
                ? member.workCategory?.name
                : null,
              member.profile?.showAttendanceCount &&
              member._count.attendance > 0
                ? `${member._count.attendance} حضور`
                : null,
              ...workplaces
            ].filter((item): item is string => Boolean(item));

            return (
              <Link
                key={member.id}
                href={`/members/${member.id}` as Route}
                className="block cursor-pointer"
              >
                <UserCard
                  className={
                    statusTone
                      ? `transition duration-200 ${statusTone.card}`
                      : "transition duration-200 hover:border-ember/30"
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-black text-ember">
                      {rank.toLocaleString("fa-IR")}
                    </span>
                    <UserAvatar
                      photoUrl={member.photoUrl}
                      name={name}
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate font-black text-white">
                              {name}
                            </h2>
                            {member.id === currentUser.id ? (
                              <span className="shrink-0 rounded-full bg-ember/15 px-2 py-0.5 text-[11px] font-bold text-ember">
                                خودت
                              </span>
                            ) : null}
                          </div>
                          {member.profile?.showTelegramUsername &&
                          member.username ? (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              <span dir="ltr">@{member.username}</span>
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 pt-0.5 text-xs font-bold text-slate-400">
                          {formatSteps(member.xp)}
                        </p>
                      </div>
                      {showWorkStatus || chips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {showWorkStatus ? (
                            <WorkStatusBadge
                              status={member.profile?.workStatus}
                            />
                          ) : null}
                          {chips.map((chip) => (
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
                  </div>
                  {member.profile?.bio ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                      {member.profile.bio}
                    </p>
                  ) : null}
                </UserCard>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {page > 1 ? (
          <Link
            href={buildMembersHref({
              category,
              status: status ?? undefined,
              q,
              page: page - 1
            })}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white transition duration-200"
          >
            قبلی
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={buildMembersHref({
              category,
              status: status ?? undefined,
              q,
              page: page + 1
            })}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-ember text-sm font-black text-ink transition duration-200 active:scale-[0.99]"
          >
            بعدی
          </Link>
        ) : null}
      </div>
    </UserPageShell>
  );
}
