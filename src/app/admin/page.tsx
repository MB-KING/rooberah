import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  Images,
  UserCheck,
  UsersRound
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Role } from "@prisma/client";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/modules/auth/authorization";
import { requireAdminPage } from "@/modules/auth/admin-session";

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const isSuperAdmin = hasRole(admin, Role.SUPER_ADMIN);

  const [users, events, registrations, presentAttendance, pendingFeedback, pendingPhotos] =
    await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.event.count({ where: { deletedAt: null } }),
    prisma.eventRegistration.count({ where: { status: "REGISTERED" } }),
    prisma.attendance.count({ where: { status: "PRESENT" } }),
    prisma.eventFeedback.count({ where: { status: "PENDING" } }),
    prisma.eventPhoto.count({ where: { status: "PENDING" } })
  ]);

  const latestEvents = await prisma.event.findMany({
    orderBy: { date: "desc" },
    take: 5,
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
          attendance: { where: { status: "PRESENT" } }
        }
      }
    }
  });

  const stats = [
    {
      label: "اعضا",
      value: users,
      Icon: UsersRound,
      href: isSuperAdmin ? "/admin/users" : null
    },
    {
      label: "برنامه‌ها",
      value: events,
      Icon: CalendarDays,
      href: "/admin/events"
    },
    {
      label: "ثبت‌نام فعال",
      value: registrations,
      Icon: UserCheck,
      href: "/admin/events"
    },
    {
      label: "حضور تأییدشده",
      value: presentAttendance,
      Icon: CheckCircle2,
      href: "/admin/events"
    }
  ];

  return (
    <>
      <PageTitle
        title="داشبورد مدیریت"
        subtitle="سریع وارد بخش مورد نیازت شو."
        action={
          <Link href="/admin/events/new" className="block">
            <Button className="w-full">
              <CalendarPlus2 size={18} aria-hidden="true" />
              ساخت برنامه جدید
            </Button>
          </Link>
        }
      />

      {pendingFeedback + pendingPhotos > 0 ? (
        <Link href={"/admin/moderation" as Route} className="mb-4 block">
          <AdminCard className="border-[#F39C12]/35 bg-[#F39C12]/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-white">در انتظار تأیید</p>
                <p className="mt-1 text-sm leading-7 text-[#FDE68A]">
                  {pendingFeedback.toLocaleString("fa-IR")} نظر و{" "}
                  {pendingPhotos.toLocaleString("fa-IR")} عکس باید بررسی شود.
                </p>
              </div>
              <Images className="text-[#F39C12]" size={22} aria-hidden="true" />
            </div>
          </AdminCard>
        </Link>
      ) : (
        <Link href={"/admin/moderation" as Route} className="mb-4 block">
          <AdminCard>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">
                صف تأیید نظر و عکس خالی است.
              </p>
              <Images className="text-[#F39C12]" size={20} aria-hidden="true" />
            </div>
          </AdminCard>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, Icon, href }) => {
          const body = (
            <AdminCard className="h-full">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-300">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F39C12]/15 text-[#F39C12]">
                  <Icon size={18} aria-hidden="true" />
                </div>
              </div>
            </AdminCard>
          );
          return href ? (
            <Link key={label} href={href as Route}>
              {body}
            </Link>
          ) : (
            <div key={label}>{body}</div>
          );
        })}
      </section>

      <AdminCard className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">آخرین برنامه‌ها</h2>
            <p className="mt-1 text-sm text-slate-400">ورود سریع به حضور</p>
          </div>
          <CalendarDays className="text-[#F39C12]" aria-hidden="true" />
        </div>
        <div className="grid gap-3">
          {latestEvents.length === 0 ? (
            <p className="text-sm text-slate-300">هنوز برنامه‌ای ساخته نشده.</p>
          ) : (
            latestEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 bg-[#1C1008]/70 p-3"
              >
                <p className="font-black text-white">{event.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {event.locationName}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {event._count.registrations} ثبت‌نام،{" "}
                  {event._count.attendance} حضور
                </p>
                <Link
                  className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[#F39C12]"
                  href={`/admin/events/${event.id}/attendance`}
                >
                  حضور و غیاب <ArrowLeft size={15} aria-hidden="true" />
                </Link>
              </div>
            ))
          )}
        </div>
      </AdminCard>
    </>
  );
}
