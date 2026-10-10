import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { getPublicMemberView } from "@/shared/privacy";

export const dynamic = "force-dynamic";

function shortName(name: string, max = 18) {
  const chars = Array.from(name.trim());
  if (chars.length <= max) return name;
  return `${chars.slice(0, max - 1).join("")}…`;
}

export default async function EventParticipantsPage({
  params,
  searchParams
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { eventId } = await params;
  const { cursor } = await searchParams;
  const take = 30;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    select: { id: true, title: true }
  });
  if (!event) notFound();

  const rows = await prisma.eventRegistration.findMany({
    where: { eventId, status: "REGISTERED" },
    orderBy: [{ registeredAt: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          photoUrl: true,
          telegramPhotoUrl: true,
          profile: true,
          workCategory: { select: { id: true, name: true } }
        }
      }
    }
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const items = page
    .filter((row) => row.user.profile?.showInMembersDirectory !== false)
    .map((row) => ({
      registrationId: row.id,
      member: getPublicMemberView(row.user)
    }));

  return (
    <UserPageShell>
      <UserPageHeader
        title="شرکت‌کنندگان"
        subtitle={event.title}
        backFallbackHref={`/events/${eventId}` as Route}
      />
      <div className="grid min-w-0 gap-3">
        {items.length === 0 ? (
          <UserCard className="py-10 text-center text-sm text-slate-400">
            هنوز شرکت‌کننده قابل‌نمایشی نیست.
          </UserCard>
        ) : (
          items.map(({ registrationId, member }) => (
            <Link
              key={registrationId}
              href={`/members/${member.id}` as Route}
              className="block min-w-0 max-w-full overflow-hidden"
            >
              <UserCard className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
                <UserAvatar
                  photoUrl={member.photoUrl}
                  name={member.displayName}
                  size={48}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p
                    className="truncate font-black text-white"
                    title={member.displayName}
                  >
                    {shortName(member.displayName)}
                  </p>
                  {member.username ? (
                    <p className="truncate text-sm text-slate-400" dir="ltr">
                      @{shortName(member.username)}
                    </p>
                  ) : null}
                </div>
              </UserCard>
            </Link>
          ))
        )}
      </div>
      {hasMore && page[page.length - 1] ? (
        <Link
          href={
            `/events/${eventId}/participants?cursor=${page[page.length - 1].id}` as Route
          }
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white"
        >
          نمایش بیشتر
        </Link>
      ) : null}
    </UserPageShell>
  );
}
