import { notFound } from "next/navigation";
import Image from "next/image";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { mediaPublicPath } from "@/modules/media/media.service";
import { WorkStatusBadge } from "@/components/user/work-status-badge";
import { getPublicMemberView } from "@/shared/privacy";
import { readSocialLinks, socialLinkLabel } from "@/shared/social-links";
import { formatSteps } from "@/shared/steps";

export const dynamic = "force-dynamic";

export default async function PublicMemberPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const member = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      profile: true,
      workCategory: true,
      badges: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
        take: 12
      },
      attendance: {
        where: { status: "PRESENT" },
        orderBy: { verifiedAt: "desc" },
        take: 8,
        include: {
          event: {
            include: {
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1
              }
            }
          }
        }
      }
    }
  });

  if (!member || member.profile?.showInMembersDirectory === false) {
    notFound();
  }

  const attendanceCount = await prisma.attendance.count({
    where: { userId, status: "PRESENT" }
  });
  const view = getPublicMemberView(member, {
    includeXp: true,
    attendanceCount
  });

  const social = readSocialLinks(view.socialLinks);

  return (
    <UserPageShell>
      <UserPageHeader
        title={view.displayName}
        subtitle="پروفایل همراه"
        backFallbackHref="/members"
      />
      <UserCard className="mb-4">
        <div className="flex items-center gap-3">
          <UserAvatar
            photoUrl={view.photoUrl}
            name={view.displayName}
            size={72}
          />
          <div>
            <h2 className="text-xl font-black text-white">{view.displayName}</h2>
            {view.username ? (
              <p className="text-sm text-slate-400">@{view.username}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <WorkStatusBadge status={view.workStatus} />
              {view.workCategory ? (
                <span className="text-sm font-bold text-ember">
                  {view.workCategory.name}
                </span>
              ) : null}
            </div>
            {view.businessName ? (
              <p className="mt-1 text-sm text-slate-300">
                کسب‌وکار: {view.businessName}
              </p>
            ) : null}
          </div>
        </div>
        {view.skills ? (
          <p className="mt-4 text-sm text-slate-300">
            <span className="font-bold text-ember">مهارت‌ها: </span>
            {view.skills}
          </p>
        ) : null}
        {view.bio ? (
          <p className="mt-3 text-sm leading-7 text-slate-300">{view.bio}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="امتیاز" value={formatSteps(view.xp ?? 0)} />
          {view.attendanceCount != null ? (
            <Metric
              label="حضور"
              value={`${view.attendanceCount.toLocaleString("fa-IR")} برنامه`}
            />
          ) : null}
        </div>
        {Object.keys(social).length > 0 ? (
          <div className="mt-4 grid gap-2">
            <p className="text-xs font-bold text-slate-400">لینک‌ها</p>
            <div className="grid gap-2">
              {Object.entries(social).map(([key, value]) => (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-slate-200 transition duration-200 hover:border-ember/40 hover:text-white"
                >
                  <span>{socialLinkLabel(key)}</span>
                  <span className="truncate text-xs font-medium text-ember" dir="ltr">
                    باز کردن
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </UserCard>

      {member.badges.length > 0 ? (
        <UserCard className="mb-4">
          <h3 className="font-black text-white">نشان‌ها</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {member.badges.map((item) => (
              <span
                key={item.id}
                className="rounded-lg bg-ember/15 px-3 py-1.5 text-xs font-bold text-amber-400"
              >
                {item.badge.name}
              </span>
            ))}
          </div>
        </UserCard>
      ) : null}

      <UserCard>
        <h3 className="font-black text-white">تاریخچه برنامه‌ها</h3>
        <div className="mt-3 grid gap-3">
          {member.attendance.length === 0 ? (
            <p className="text-sm text-slate-400">هنوز حضور تأییدشده‌ای نیست.</p>
          ) : (
            member.attendance.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 rounded-xl bg-white/[0.05] p-2"
              >
                {item.event.images[0] ? (
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={mediaPublicPath(item.event.images[0].mediaAssetId)}
                      alt={item.event.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {item.event.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    برنامه {item.event.eventNumber}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </UserCard>
    </UserPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.05] p-3">
      <p className="text-xs font-bold text-ember">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
