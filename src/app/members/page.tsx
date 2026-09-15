import {
  BriefcaseBusiness,
  Footprints,
  Trophy,
  UsersRound
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/user/empty-state";
import { APP_NAME } from "@/shared/brand";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import {
  secondaryActionClass,
  UserPageShell
} from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserPage } from "@/modules/auth/session";
import { BadgeService } from "@/modules/gamification/badge.service";
import { formatSteps } from "@/shared/steps";

export const dynamic = "force-dynamic";

type SortMode = "recent" | "steps";

function buildMembersHref(input: {
  sort: SortMode;
  category?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.sort === "steps") params.set("sort", "steps");
  if (input.category) params.set("category", input.category);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return (query ? `/members?${query}` : "/members") as Route;
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const currentUser = await requireCurrentUserPage();
  await new BadgeService().syncCommunityRoleBadges(currentUser.communityId);
  const { category, sort: sortRaw, page: pageRaw } = await searchParams;
  const sort: SortMode = sortRaw === "steps" ? "steps" : "recent";
  const page = Math.max(Number(pageRaw ?? 1) || 1, 1);
  const take = 20;
  const skip = (page - 1) * take;

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
      where: {
        communityId: currentUser.communityId,
        deletedAt: null,
        profile: { is: { showInMembersDirectory: true } },
        ...(category ? { workCategoryId: category } : {})
      }
    }),
    prisma.user.findMany({
      where: {
        communityId: currentUser.communityId,
        deletedAt: null,
        profile: { is: { showInMembersDirectory: true } },
        ...(category ? { workCategoryId: category } : {})
      },
      orderBy:
        sort === "steps"
          ? [{ xp: "desc" }, { joinedAt: "asc" }]
          : [{ joinedAt: "desc" }],
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
  if (sort === "steps" && community?.leaderboardEnabled) {
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
      <UserPageHeader
        title="همراهان"
        subtitle={
          sort === "steps"
            ? "رتبه‌بندی همراهان بر اساس امتیاز."
            : "اعضایی که می‌خواهند در جامعه دیده شوند."
        }
        backFallbackHref="/me"
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Link
          href={buildMembersHref({ sort: "recent", category })}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-bold transition duration-200 ${
            sort === "recent"
              ? "bg-ember text-ink"
              : "bg-white/10 text-slate-200"
          }`}
        >
          تازه‌ها
        </Link>
        <Link
          href={buildMembersHref({ sort: "steps", category })}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition duration-200 ${
            sort === "steps"
              ? "bg-ember text-ink"
              : "bg-white/10 text-slate-200"
          }`}
        >
          <Trophy size={15} aria-hidden="true" />
          بیشترین امتیاز
        </Link>
      </div>

      {sort === "steps" && myRank ? (
        <UserCard className="mb-4 border-ember/25 bg-pine">
          <div className="flex items-center gap-3">
            <Trophy className="text-ember" size={22} />
            <div>
              <p className="font-black text-white">
                رتبه تو: {myRank.toLocaleString("fa-IR")}
              </p>
              <p className="text-sm text-slate-300">
                {formatSteps(currentUser.xp)}
              </p>
            </div>
          </div>
        </UserCard>
      ) : null}

      {categories.length > 0 ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Link
            href={buildMembersHref({ sort })}
            className={`shrink-0 cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition duration-200 ${
              !category
                ? "bg-ember text-ink"
                : "bg-white/10 text-slate-200"
            }`}
          >
            همه
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              href={buildMembersHref({ sort, category: item.id })}
              className={`shrink-0 cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition duration-200 ${
                category === item.id
                  ? "bg-ember text-ink"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3">
        {members.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="هنوز پروفایل عمومی وجود ندارد"
            description="از تنظیمات پروفایل می‌توانی خودت را در فهرست همراهان نشان بدهی."
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
            return (
              <Link
                key={member.id}
                href={`/members/${member.id}` as Route}
                className="block cursor-pointer"
              >
                <UserCard>
                  <div className="flex items-start gap-3">
                    {sort === "steps" ? (
                      <span className="w-8 shrink-0 pt-2 text-center text-sm font-black text-ember">
                        {rank.toLocaleString("fa-IR")}
                      </span>
                    ) : null}
                    <UserAvatar
                      photoUrl={member.photoUrl}
                      name={name}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-black text-white">
                        {name}
                        {member.id === currentUser.id ? (
                          <span className="mr-2 text-xs text-ember">
                            (خودت)
                          </span>
                        ) : null}
                      </h2>
                      {sort === "steps" ? (
                        <p className="mt-1 text-sm text-slate-400">
                          {formatSteps(member.xp)}
                        </p>
                      ) : null}
                      {member.profile?.showWorkCategory !== false &&
                      member.workCategory ? (
                        <p className="mt-1 text-xs font-bold text-ember">
                          {member.workCategory.name}
                        </p>
                      ) : null}
                      {member.profile?.showTelegramUsername &&
                      member.username ? (
                        <p className="mt-1 text-sm text-slate-400" dir="ltr">
                          @{member.username}
                        </p>
                      ) : null}
                      {member.badges.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {member.badges.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-lg bg-ember/15 px-2 py-1 text-[11px] font-bold text-amber-400"
                            >
                              {item.badge.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {member.profile?.bio && sort === "recent" ? (
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {member.profile.bio}
                    </p>
                  ) : null}
                  {sort === "recent" ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      {member.profile?.showAttendanceCount ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5">
                          <Footprints size={14} className="text-ember" />
                          {member._count.attendance} حضور
                        </span>
                      ) : null}
                      {member.profile?.showBusiness
                        ? member.businessMemberships.map(({ business }) => (
                            <span
                              key={business.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5"
                            >
                              <BriefcaseBusiness
                                size={14}
                                className="text-ember"
                              />
                              {business.name}
                            </span>
                          ))
                        : null}
                    </div>
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
            href={buildMembersHref({ sort, category, page: page - 1 })}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white transition duration-200"
          >
            قبلی
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={buildMembersHref({ sort, category, page: page + 1 })}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-ember text-sm font-black text-ink transition duration-200 active:scale-[0.99]"
          >
            بعدی
          </Link>
        ) : null}
      </div>
    </UserPageShell>
  );
}
