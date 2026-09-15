import { CalendarPlus2, ClipboardCheck, Images, Pencil } from "lucide-react";
import Link from "next/link";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { EventStatusActions } from "@/components/admin/event-status-actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { secondaryActionClass } from "@/components/user/user-action-styles";
import { prisma } from "@/lib/prisma";
import { faTehranDayFormatter } from "@/lib/tehran-time";
import { requireEventManagerPage } from "@/modules/auth/admin-session";

function announceBanner(params: {
  announce?: string;
  sent?: string;
  failed?: string;
}) {
  if (!params.announce) return null;
  if (params.announce === "sent") {
    const sent = params.sent ?? "1";
    const failed = params.failed ? ` — ${params.failed} مورد ناموفق` : "";
    return `اعلان برنامه به ${sent} گروه/کانال ارسال شد${failed}.`;
  }
  if (params.announce === "already") {
    return "اعلان این برنامه قبلاً ارسال شده بود.";
  }
  if (params.announce === "disabled") {
    return "اعلان خودکار جامعه خاموش است؛ پیام به گروه ارسال نشد.";
  }
  if (params.announce === "no_targets") {
    return "هیچ گروه/کانال فعالی برای اعلان تنظیم نشده است.";
  }
  if (params.announce === "failed") {
    return "ارسال اعلان به تلگرام ناموفق بود. دسترسی ربات در گروه را چک کن.";
  }
  return null;
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<{ announce?: string; sent?: string; failed?: string }>;
}) {
  await requireEventManagerPage();
  const params = await searchParams;
  const banner = announceBanner(params);
  const events = await prisma.event.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
          attendance: { where: { status: "PRESENT" } }
        }
      }
    }
  });

  return (
    <>
      <PageTitle
        title="مدیریت برنامه‌ها"
        subtitle="برنامه بساز، ثبت‌نام را کنترل کن و بعد از اجرا حضور را تأیید کن."
        action={
          <Link href="/admin/events/new" className="block">
            <Button className="w-full">
              <CalendarPlus2 size={18} aria-hidden="true" />
              برنامه جدید
            </Button>
          </Link>
        }
      />
      {banner ? (
        <AdminCard className="mb-4 border border-[#F39C12]/35 bg-[#F39C12]/10">
          <p className="text-sm font-bold leading-7 text-[#FDE68A]">{banner}</p>
        </AdminCard>
      ) : null}

      <details className="mb-4 rounded-xl border border-[#F39C12]/25 bg-[#2A160C] p-4">
        <summary className="cursor-pointer font-black text-white">
          معنی وضعیت‌ها
        </summary>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          «آماده ثبت‌نام» برای اعضا نمایش داده می‌شود. «ثبت‌نام بسته» وقتی
          ظرفیت/مهلت تمام شده. بعد از اجرا «برگزار شده» کن و حضور را ثبت کن.
        </p>
      </details>

      <div className="grid gap-3">
        {events.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-slate-300">
              هنوز برنامه‌ای ثبت نشده است.
            </p>
          </AdminCard>
        ) : (
          events.map((event) => (
            <AdminCard key={event.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">{event.title}</h2>
                <StatusPill status={event.status} />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                شماره {event.eventNumber}،{" "}
                {faTehranDayFormatter.format(event.date)}،{" "}
                {event.locationName}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {event._count.registrations} ثبت‌نام، {event._count.attendance}{" "}
                حضور
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  className={secondaryActionClass}
                  href={`/admin/events/${event.id}/edit`}
                >
                  <Pencil size={16} aria-hidden="true" />
                  ویرایش
                </Link>
                <Link
                  className={`${secondaryActionClass} border-[#F39C12]/30 text-[#F39C12]`}
                  href={`/admin/events/${event.id}/attendance`}
                >
                  <ClipboardCheck size={16} aria-hidden="true" />
                  حضور و غیاب
                </Link>
                <Link
                  className={secondaryActionClass}
                  href={`/admin/events/${event.id}/feedback`}
                >
                  <Images size={16} aria-hidden="true" />
                  نظرات و عکس‌ها
                </Link>
              </div>
              <EventStatusActions eventId={event.id} status={event.status} />
            </AdminCard>
          ))
        )}
      </div>
    </>
  );
}
