import { EventStatus } from "@prisma/client";
import { createEventAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { LocationMapPicker } from "@/components/admin/location-map-picker";
import { PersianDateField } from "@/components/admin/persian-date-field";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { MEETING_OFFSET_MINUTES } from "@/shared/event-timing";

export default async function NewEventPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireEventManagerPage();
  const { error } = await searchParams;
  const latest = await prisma.event.findFirst({
    where: { communityId: admin.communityId, deletedAt: null },
    orderBy: { eventNumber: "desc" },
    select: { eventNumber: true }
  });
  const nextEventNumber = (latest?.eventNumber ?? 0) + 1;

  return (
    <>
      <PageTitle
        showBack
        backFallbackHref="/admin/events"
        title="برنامه جدید"
        subtitle="اطلاعاتی را وارد کن که عضو برای تصمیم‌گیری سریع و راحت نیاز دارد."
      />

      {error ? (
        <AdminCard className="mb-4 border-red-400/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-200">{error}</p>
        </AdminCard>
      ) : null}

      <AdminCard>
        <form action={createEventAction} className="grid gap-4">
          <Field
            label="نام برنامه"
            name="title"
            required
            placeholder="مثلا ۱۲۰امین برنامه پیاده‌روی گروهی"
          />
          <Field
            label="شماره برنامه"
            name="eventNumber"
            type="number"
            required
            placeholder="120"
            defaultValue={String(nextEventNumber)}
          />
          <PersianDateField name="date" required />
          <Field
            label="زمان شروع مسیر"
            name="startTime"
            type="time"
            required
          />
          <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-6 text-slate-300">
            ساعت جمع شدن خودکار {MEETING_OFFSET_MINUTES} دقیقه قبل از شروع مسیر
            ثبت می‌شود. ثبت‌نام تا وقتی وضعیت «بستن ثبت‌نام» نشود باز است و حضور
            هم هر زمان قابل ثبت است.
          </p>
          <Field
            label="نام محل قرار"
            name="locationName"
            required
            placeholder="بوستان آب و آتش"
          />
          <Field label="ظرفیت" name="capacity" type="number" placeholder="80" />
          <LocationMapPicker />
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            وضعیت نمایش
            <select
              name="status"
              defaultValue={EventStatus.PUBLISHED}
              className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
            >
              <option value={EventStatus.DRAFT}>ذخیره به‌عنوان پیش‌نویس</option>
              <option value={EventStatus.PUBLISHED}>
                نمایش و باز کردن ثبت‌نام
              </option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            آدرس محل قرار
            <input
              name="locationAddress"
              className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
              placeholder="مثلا کنار ورودی اصلی پارک"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            توضیحات کوتاه برای اعضا
            <textarea
              name="description"
              rows={4}
              className="rounded-xl border border-white/10 bg-[#1C1008] px-3 py-3 text-white outline-none focus:border-[#F39C12]"
              placeholder="مسیر، وسایل پیشنهادی، سطح سختی و نکته‌های مهم را کوتاه و روشن بنویس."
            />
          </label>
          <div>
            <Button
              className="w-full"
              type="submit"
              pendingLabel="در حال ساخت…"
            >
              ساخت برنامه
            </Button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  className,
  step,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label
      className={`grid gap-2 text-sm font-bold text-slate-200 ${className ?? ""}`}
    >
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
    </label>
  );
}
