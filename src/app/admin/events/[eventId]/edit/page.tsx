import { EventStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEventAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { EventImageUploadForm } from "@/components/admin/event-image-upload-form";
import { LocationMapPicker } from "@/components/admin/location-map-picker";
import { PersianDateField } from "@/components/admin/persian-date-field";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { mediaPublicPath } from "@/modules/media/media.service";
import { MEETING_OFFSET_MINUTES } from "@/shared/event-timing";
import { dateInputValue, timeInputValue } from "@/shared/form-date";

export default async function EditEventPage({
  params,
  searchParams
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireEventManagerPage();
  const { eventId } = await params;
  const { error } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, include: { mediaAsset: true } }
    }
  });

  if (!event) {
    notFound();
  }

  return (
    <>
      <PageTitle
        showBack
        backFallbackHref="/admin/events"
        title="ویرایش برنامه"
        subtitle="سوپرادمین می‌تواند اطلاعات اصلی، زمان، مکان، ظرفیت و وضعیت برنامه را اصلاح کند."
      />
      {error ? (
        <AdminCard className="mb-4 border-red-400/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-200">{error}</p>
        </AdminCard>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/admin/events/${eventId}/feedback` as Route}
          className="inline-flex h-11 items-center rounded-xl bg-white/10 px-4 text-sm font-bold text-white"
        >
          نظرات و عکس‌ها
        </Link>
      </div>
      <AdminCard className="mb-4">
        <h2 className="mb-3 font-black text-white">تصاویر برنامه</h2>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {event.images.map((image) => (
            <a
              key={image.id}
              href={mediaPublicPath(image.mediaAssetId)}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaPublicPath(image.mediaAssetId)}
                alt={image.caption || "تصویر برنامه"}
                className="aspect-square w-full object-cover"
              />
              {image.caption ? (
                <p className="truncate px-2 py-1 text-xs font-bold text-slate-300">
                  {image.caption}
                </p>
              ) : null}
            </a>
          ))}
        </div>
        <EventImageUploadForm eventId={event.id} />
      </AdminCard>
      <AdminCard>
        <form action={updateEventAction} className="grid gap-4">
          <input type="hidden" name="eventId" value={event.id} />
          <Field
            label="نام برنامه"
            name="title"
            required
            defaultValue={event.title}
          />
          <Field
            label="شماره برنامه"
            name="eventNumber"
            type="number"
            required
            defaultValue={String(event.eventNumber)}
          />
          <PersianDateField
            name="date"
            required
            defaultValue={dateInputValue(event.date)}
          />
          <Field
            label="زمان شروع مسیر"
            name="startTime"
            type="time"
            required
            defaultValue={timeInputValue(event.startTime)}
          />
          <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-6 text-slate-300">
            ساعت جمع شدن فعلی: {timeInputValue(event.meetingTime)} — با ذخیره،
            خودکار {MEETING_OFFSET_MINUTES} دقیقه قبل از شروع مسیر تنظیم می‌شود.
          </p>
          <Field
            label="نام محل قرار"
            name="locationName"
            required
            defaultValue={event.locationName}
          />
          <Field
            label="ظرفیت"
            name="capacity"
            type="number"
            defaultValue={event.capacity ? String(event.capacity) : ""}
          />
          <LocationMapPicker
            latitude={event.latitude != null ? Number(event.latitude) : null}
            longitude={event.longitude != null ? Number(event.longitude) : null}
          />
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            وضعیت نمایش
            <select
              name="status"
              defaultValue={event.status}
              className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
            >
              <option value={EventStatus.DRAFT}>پیش‌نویس</option>
              <option value={EventStatus.PUBLISHED}>آماده ثبت‌نام</option>
              <option value={EventStatus.REGISTRATION_CLOSED}>
                ثبت‌نام بسته
              </option>
              <option value={EventStatus.COMPLETED}>برگزار شده</option>
              <option value={EventStatus.CANCELLED}>لغو شده</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            آدرس محل قرار
            <input
              name="locationAddress"
              defaultValue={event.locationAddress ?? ""}
              className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            توضیحات
            <textarea
              name="description"
              rows={4}
              defaultValue={event.description ?? ""}
              className="rounded-xl border border-white/10 bg-[#1C1008] px-3 py-3 text-white outline-none focus:border-[#F39C12]"
            />
          </label>
          <div>
            <Button
              className="w-full"
              type="submit"
              pendingLabel="در حال ذخیره…"
            >
              ذخیره تغییرات
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
  defaultValue,
  className,
  step
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  step?: string;
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
        defaultValue={defaultValue}
        step={step}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
    </label>
  );
}
