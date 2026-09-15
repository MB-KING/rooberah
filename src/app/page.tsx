import { Role } from "@prisma/client";
import { ArrowLeft, CalendarDays, Images, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmptyState } from "@/components/user/empty-state";
import { EventCard } from "@/components/user/event-card";
import { NotificationsBell } from "@/components/user/notifications-bell";
import {
  secondaryActionClass,
  UserPageShell
} from "@/components/user/user-shell";
import { defaultCommunitySlug } from "@/lib/config";
import { APP_NAME, APP_SLOGAN } from "@/shared/brand";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/modules/auth/authorization";
import { getOptionalCurrentUser } from "@/modules/auth/session";

const eventCardInclude = (userId?: string) => ({
  _count: {
    select: { registrations: { where: { status: "REGISTERED" as const } } }
  },
  registrations: userId
    ? {
        where: {
          userId,
          status: { in: ["REGISTERED" as const, "WAITLISTED" as const] }
        },
        select: { status: true },
        take: 1
      }
    : false
});

async function getHomeData() {
  const currentUser = await getOptionalCurrentUser();
  const cardInclude = eventCardInclude(currentUser?.id);
  const [events, completedEvents, community] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
        deletedAt: null
      },
      orderBy: { date: "asc" },
      take: 2,
      include: cardInclude
    }),
    prisma.event.findMany({
      where: { status: "COMPLETED", deletedAt: null },
      orderBy: { date: "desc" },
      take: 2,
      include: cardInclude
    }),
    prisma.community.findFirst({
      where: currentUser
        ? { id: currentUser.communityId }
        : { slug: defaultCommunitySlug, isActive: true },
      select: { name: true, tagline: true }
    })
  ]);

  return {
    events,
    completedEvents,
    communityName: community?.name ?? APP_NAME,
    communityTagline: community?.tagline ?? APP_SLOGAN,
    canOpenAdmin: currentUser
      ? hasAnyRole(currentUser, [Role.ADMIN, Role.SUPER_ADMIN])
      : false
  };
}

export default async function Home() {
  const {
    events,
    completedEvents,
    communityName,
    communityTagline,
    canOpenAdmin
  } = await getHomeData();

  return (
    <UserPageShell className="flex flex-col">
      <header className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-pine">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={72} priority />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black text-white">
                  {communityName}
                </h1>
                <p className="mt-1 text-sm font-bold text-ember">
                  {communityTagline}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black text-white">برنامه‌های نزدیک</h2>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-bold text-ember transition duration-200"
            href="/events"
          >
            همه
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="فعلاً برنامه‌ای برای ثبت‌نام نیست"
            description="برنامه بعدی همین‌جا می‌آید."
          />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              registrationStatus={
                Array.isArray(event.registrations)
                  ? event.registrations[0]?.status
                  : undefined
              }
            />
          ))
        )}
      </section>

      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black text-white">برگزار شده</h2>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-bold text-ember transition duration-200"
            href="/events"
          >
            آرشیو
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
        {completedEvents.length === 0 ? (
          <EmptyState
            icon={Images}
            title="هنوز برنامه برگزارشده‌ای نیست"
            description="بعد از برگزاری، آرشیو نظرات و عکس‌ها همین‌جا می‌ماند."
          />
        ) : (
          completedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              registrationStatus={
                Array.isArray(event.registrations)
                  ? event.registrations[0]?.status
                  : undefined
              }
            />
          ))
        )}
      </section>
    </UserPageShell>
  );
}
