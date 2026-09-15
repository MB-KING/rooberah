import { AttendanceStatus, RegistrationStatus } from "@prisma/client";
import { verifyAttendanceAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { prisma } from "@/lib/prisma";
import { faTehranDayFormatter } from "@/lib/tehran-time";
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { attendanceStatusLabels, labelOf, registrationStatusLabels } from "@/shared/labels";

export default async function AttendancePage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireEventManagerPage();
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: { in: ["REGISTERED", "WAITLISTED"] } },
        include: {
          user: {
            include: {
              attendance: { where: { eventId } }
            }
          }
        },
        orderBy: { registeredAt: "asc" }
      }
    }
  });

  if (!event) {
    return (
      <AdminCard>
        <p className="text-slate-300">برنامه پیدا نشد.</p>
      </AdminCard>
    );
  }

  return (
    <>
      <PageTitle
        showBack
        backFallbackHref="/admin/events"
        title="تأیید حضور"
        subtitle={`${event.title} - ${event.locationName}`}
      />
      <details className="mb-4 rounded-xl border border-[#F39C12]/25 bg-[#2A160C] p-4">
        <summary className="cursor-pointer font-black text-white">
          چرا حضور را تأیید می‌کنیم؟
        </summary>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          حضور تأییدشده مبنای امتیاز و نشان است. فقط کسانی را
          «حاضر بود» بزن که واقعا شرکت کرده‌اند.
        </p>
      </details>

      <AdminCard>
        <div className="mb-4 grid gap-2 text-sm text-slate-300">
          <span>ثبت‌نام‌ها: {event.registrations.length}</span>
          <span>تاریخ: {faTehranDayFormatter.format(event.date)}</span>
          <span>شماره برنامه: {event.eventNumber}</span>
        </div>

        <div className="grid gap-3">
          {event.registrations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-300">هنوز کسی برای این برنامه ثبت‌نام نکرده است.</div>
          ) : (
            event.registrations.map((registration) => {
              const attendance = registration.user.attendance[0];
              const displayName =
                [registration.user.firstName, registration.user.lastName].filter(Boolean).join(" ") || registration.user.username || registration.user.telegramId.toString();

              return (
                <div key={registration.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#1C1008]/70 p-3">
                  <div>
                    <p className="font-black text-white">{displayName}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      @{registration.user.username ?? "بدون نام کاربری"}، ثبت‌نام: {labelOf(registrationStatusLabels, registration.status)}، حضور:{" "}
                      {labelOf(attendanceStatusLabels, attendance?.status)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {registration.status === RegistrationStatus.REGISTERED ? (
                      <AttendanceButton eventId={event.id} userId={registration.userId} currentStatus={attendance?.status} status={AttendanceStatus.PRESENT} label="حاضر" />
                    ) : (
                      <div className="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-white/15 px-2 text-xs text-slate-400">
                        فقط قطعی
                      </div>
                    )}
                    <AttendanceButton eventId={event.id} userId={registration.userId} currentStatus={attendance?.status} status={AttendanceStatus.ABSENT} label="غایب" />
                    <AttendanceButton eventId={event.id} userId={registration.userId} currentStatus={attendance?.status} status={AttendanceStatus.REJECTED} label="رد" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AdminCard>
    </>
  );
}

function AttendanceButton({
  eventId,
  userId,
  currentStatus,
  status,
  label
}: {
  eventId: string;
  userId: string;
  currentStatus?: AttendanceStatus;
  status: AttendanceStatus;
  label: string;
}) {
  const isCurrent = currentStatus === status;

  return (
    <form action={verifyAttendanceAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <PendingSubmitButton
        className="w-full bg-white/10 px-2 text-xs font-bold text-slate-200 hover:bg-white/15 disabled:bg-[#F39C12]/20 disabled:text-[#F39C12]"
        disabled={isCurrent}
        pendingLabel="…"
      >
        {isCurrent ? `${label} ✓` : label}
      </PendingSubmitButton>
    </form>
  );
}
