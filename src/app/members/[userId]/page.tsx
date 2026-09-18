import { Globe, Linkedin } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { formatJalaliPretty } from "@/lib/jalali";
import { mediaPublicPath } from "@/modules/media/media.service";
import { adminRoles } from "@/modules/auth/admin-session";
import { hasAnyRole } from "@/modules/auth/authorization";
import { getOptionalCurrentUser } from "@/modules/auth/session";
import { WorkStatusBadge } from "@/components/user/work-status-badge";
import { cn } from "@/lib/cn";
import { getPublicMemberView } from "@/shared/privacy";
import { formatPhone } from "@/shared/phone";
import { readSocialLinks, socialLinkLabel } from "@/shared/social-links";
import { formatSteps } from "@/shared/steps";
import { workStatusTone } from "@/shared/work-status";

export const dynamic = "force-dynamic";

export default async function PublicMemberPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = await getOptionalCurrentUser();
  const canSeePhone = Boolean(viewer && hasAnyRole(viewer, adminRoles));
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
  const skills = (view.skills ?? "")
    .split(/[,،]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const statusTone = workStatusTone(view.workStatus);
  const chips = [
    view.workCategory?.name,
    view.businessName
  ].filter((item): item is string => Boolean(item));

  return (
    <UserPageShell>
      <UserPageHeader title={view.displayName} backFallbackHref="/members" />
      <UserCard className={cn("mb-4", statusTone?.card)}>
        <div className="flex items-start gap-3">
          <UserAvatar
            photoUrl={view.photoUrl}
            name={view.displayName}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-white">
              {view.displayName}
            </h2>
            {view.username ? (
              <p className="mt-0.5 truncate text-xs text-slate-400" dir="ltr">
                @{view.username}
              </p>
            ) : null}
            {canSeePhone && member.profile?.phoneNumber ? (
              <p className="mt-1 text-xs font-bold text-ember" dir="ltr">
                {formatPhone(member.profile.phoneNumber)}
              </p>
            ) : null}
            {view.workStatus || chips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <WorkStatusBadge status={view.workStatus} />
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
        {view.birthDate ? (
          <p className="mt-3 text-xs font-bold text-slate-400">
            تولد {formatJalaliPretty(view.birthDate)}
          </p>
        ) : null}
        {view.bio ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">{view.bio}</p>
        ) : null}
        {skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
          <span>
            <span className="text-white">{formatSteps(view.xp ?? 0)}</span>
          </span>
          {view.attendanceCount != null ? (
            <span>
              <span className="text-white">
                {view.attendanceCount.toLocaleString("fa-IR")}
              </span>{" "}
              حضور
            </span>
          ) : null}
        </div>
        {Object.keys(social).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(social).map(([key, value]) => {
              const Icon = key === "linkedin" ? Linkedin : Globe;
              return (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-slate-200 transition duration-200 hover:border-ember/40 hover:text-white"
                >
                  <Icon size={14} aria-hidden="true" />
                  {socialLinkLabel(key)}
                </a>
              );
            })}
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

