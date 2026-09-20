import { CalendarDays, Send } from "lucide-react";
import type { EventStatus } from "@prisma/client";
import Link from "next/link";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";
import { EventCard } from "@/components/user/event-card";
import { UserCard } from "@/components/user/user-card";
import { secondaryActionClass } from "@/components/user/user-action-styles";
import { botUsername } from "@/lib/telegram-format";
import { APP_NAME, APP_SLOGAN } from "@/shared/brand";

type GuestEvent = {
  id: string;
  title: string;
  eventNumber: number;
  date: Date;
  meetingTime: Date;
  startTime: Date;
  locationName: string;
  capacity: number | null;
  status: EventStatus;
  _count: { registrations: number };
};

export function GuestHome({ upcoming }: { upcoming: GuestEvent[] }) {
  const username = botUsername();

  return (
    <>
      <UserCard>
        <p className="text-xs font-bold text-ember">خوش آمدی</p>
        <h2 className="mt-1 text-xl font-black text-white">
          با {APP_NAME} هم‌قدم شو
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          {APP_SLOGAN}. برنامه‌های پیاده‌روی را ببین، ثبت‌نام کن و با همراهان
          آشنا شو.
        </p>
        <div className="mt-5 grid gap-2">
          <TelegramLoginWidget />
          <Link href="/events" className={secondaryActionClass}>
            <CalendarDays size={17} aria-hidden="true" />
            مشاهده برنامه‌ها
          </Link>
          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noreferrer"
            className={secondaryActionClass}
          >
            <Send size={17} aria-hidden="true" />
            باز کردن ربات @{username}
          </a>
        </div>
      </UserCard>

      <section className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">برنامه‌های پیش رو</h2>
          {upcoming.length > 0 ? (
            <Link
              href="/events"
              className="text-xs font-bold text-ember hover:text-gold"
            >
              همه
            </Link>
          ) : null}
        </div>
        {upcoming.length === 0 ? (
          <UserCard>
            <p className="text-sm leading-7 text-slate-400">
              فعلاً برنامهٔ بازی برای نمایش نیست. وارد شو تا وقتی برنامه جدید
              آمد خبرت کنیم.
            </p>
          </UserCard>
        ) : (
          upcoming.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </>
  );
}
