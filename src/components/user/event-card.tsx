import { EventStatus, RegistrationStatus } from "@prisma/client";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Hourglass,
  Images,
  MapPin,
  Route,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { UserCard } from "@/components/user/user-card";
import { cn } from "@/lib/cn";
import {
  faTehranDateShortFormatter,
  faTehranTimeFormatter
} from "@/lib/tehran-time";
import { MEETING_TIME_LABEL, START_TIME_LABEL } from "@/shared/copy";

const dateFormatter = faTehranDateShortFormatter;
const timeFormatter = faTehranTimeFormatter;

type EventCardEvent = {
  id: string;
  title: string;
  eventNumber: number;
  date: Date;
  meetingTime: Date;
  startTime: Date;
  locationName: string;
  capacity: number | null;
  status?: EventStatus;
  _count: { registrations: number };
};

export function EventCard({
  event,
  registrationStatus
}: {
  event: EventCardEvent;
  registrationStatus?: RegistrationStatus | null;
}) {
  const remaining =
    event.capacity == null
      ? null
      : Math.max(event.capacity - event._count.registrations, 0);

  const isCompleted = event.status === EventStatus.COMPLETED;
  const isRegistered = registrationStatus === RegistrationStatus.REGISTERED;
  const isWaitlisted = registrationStatus === RegistrationStatus.WAITLISTED;

  return (
    <UserCard className="overflow-hidden p-0">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
            <Route size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-ember">
                برنامه شماره {event.eventNumber}
              </p>
              {isRegistered ? (
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  ثبت‌نام شدی
                </span>
              ) : null}
              {isWaitlisted && !isCompleted ? (
                <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                  لیست انتظار
                </span>
              ) : null}
              {isCompleted ? (
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200">
                  برگزار شده
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 break-words text-lg font-black text-white">
              {event.title}
            </h2>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-300">
          <Meta
            Icon={CalendarDays}
            text={dateFormatter.format(event.date)}
          />
          <Meta
            Icon={Clock3}
            text={`${MEETING_TIME_LABEL} ${timeFormatter.format(event.meetingTime)}`}
          />
          <Meta
            Icon={Clock3}
            text={`${START_TIME_LABEL} ${timeFormatter.format(event.startTime)}`}
          />
          <Meta Icon={MapPin} text={event.locationName} />
          <Meta
            Icon={UsersRound}
            text={
              isCompleted
                ? `${event._count.registrations} نفر همراه`
                : remaining == null
                  ? `${event._count.registrations} نفر همراه`
                  : `${event._count.registrations} همراه · ${remaining} جای خالی`
            }
          />
        </div>
      </div>
      <div className="p-4">
        <Link
          href={`/events/${event.id}` as `/events/${string}`}
          className={cn(
            "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition duration-200 active:scale-[0.99]",
            isCompleted
              ? "border border-ember/35 bg-ember/10 text-amber-200 hover:bg-ember/20"
              : isRegistered
                ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                : isWaitlisted
                  ? "border border-sky-400/35 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25"
                  : "bg-ember text-ink shadow-ember/20 hover:bg-gold"
          )}
        >
          {isCompleted ? (
            <>
              <Images size={16} aria-hidden="true" />
              نظرات و عکس‌ها
            </>
          ) : isRegistered ? (
            <>
              <CalendarCheck2 size={16} aria-hidden="true" />
              مشاهده ثبت‌نام من
            </>
          ) : isWaitlisted ? (
            <>
              <Hourglass size={16} aria-hidden="true" />
              مشاهده لیست انتظار
            </>
          ) : (
            <>
              مشاهده و ثبت‌نام
              <ArrowLeft size={16} aria-hidden="true" />
            </>
          )}
        </Link>
      </div>
    </UserCard>
  );
}

function Meta({
  Icon,
  text
}: {
  Icon: typeof CalendarDays;
  text: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
      <Icon size={16} className="shrink-0 text-ember" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  );
}
