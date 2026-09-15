import { ModerationStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewActions } from "@/components/admin/review-actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { prisma } from "@/lib/prisma";
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { EventPhotoService } from "@/modules/events/event-photo.service";
import { FeedbackService } from "@/modules/feedback/feedback.service";
import { mediaPublicPath } from "@/modules/media/media.service";
import { labelOf, moderationStatusLabels } from "@/shared/labels";
import { getDisplayName } from "@/shared/privacy";

function statusClass(status: ModerationStatus) {
  if (status === ModerationStatus.APPROVED) {
    return "text-emerald-300";
  }
  if (status === ModerationStatus.REJECTED) {
    return "text-red-300";
  }
  return "text-[#FDE68A]";
}

export default async function AdminEventFeedbackPage({
  params
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireEventManagerPage();
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, eventNumber: true }
  });
  if (!event) notFound();

  const feedbackService = new FeedbackService();
  const photoService = new EventPhotoService();
  const [stats, items, photos] = await Promise.all([
    feedbackService.statsForEvent(eventId, true),
    feedbackService.listForEvent(eventId),
    photoService.listForEvent(eventId)
  ]);
  const pendingFeedback = items.filter(
    (item) => item.status === ModerationStatus.PENDING
  ).length;
  const pendingPhotos = photos.filter(
    (item) => item.status === ModerationStatus.PENDING
  ).length;

  return (
    <>
      <PageTitle
        showBack
        backFallbackHref="/admin/events"
        title={`نظرات و عکس‌های برنامه ${event.eventNumber}`}
        subtitle={event.title}
      />
      <AdminCard className="mb-4">
        <p className="text-sm leading-7 text-slate-300">
          میانگین نظرات تأییدشده:{" "}
          <span className="font-black text-[#F39C12]">
            {stats.average.toFixed(1)}
          </span>{" "}
          از {stats.count.toLocaleString("fa-IR")} نظر.{" "}
          {pendingFeedback.toLocaleString("fa-IR")} نظر و{" "}
          {pendingPhotos.toLocaleString("fa-IR")} عکس در انتظار تأیید.
        </p>
        <Link
          href={`/admin/events/${eventId}/edit` as Route}
          className="mt-3 inline-flex text-sm font-bold text-[#F39C12]"
        >
          بازگشت به ویرایش برنامه
        </Link>
      </AdminCard>

      <h2 className="mb-3 font-black text-white">نظرات</h2>
      <div className="mb-6 grid gap-3">
        {items.length === 0 ? (
          <AdminCard className="text-sm text-slate-400">
            هنوز نظری ثبت نشده.
          </AdminCard>
        ) : (
          items.map((item) => (
            <AdminCard key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-white">
                  {getDisplayName(item.user)}
                </p>
                <p className={`text-xs font-bold ${statusClass(item.status)}`}>
                  {labelOf(moderationStatusLabels, item.status)}
                </p>
              </div>
              <p className="mt-1 text-sm font-bold text-[#F39C12]">
                {item.rating} ستاره
              </p>
              {item.comment ? (
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {item.comment}
                </p>
              ) : null}
              <ReviewActions
                kind="feedback"
                id={item.id}
                eventId={eventId}
                status={item.status}
              />
            </AdminCard>
          ))
        )}
      </div>

      <h2 className="mb-3 font-black text-white">عکس‌های همراهان</h2>
      <div className="grid gap-3">
        {photos.length === 0 ? (
          <AdminCard className="text-sm text-slate-400">
            هنوز عکسی ارسال نشده.
          </AdminCard>
        ) : (
          photos.map((photo) => (
            <AdminCard key={photo.id}>
              <div className="flex items-start gap-3">
                <a
                  href={mediaPublicPath(photo.mediaAssetId)}
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaPublicPath(photo.mediaAssetId)}
                    alt={photo.caption || "عکس برنامه"}
                    className="h-full w-full object-cover"
                  />
                </a>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-black text-white">
                      {getDisplayName(photo.user)}
                    </p>
                    <p className={`text-xs font-bold ${statusClass(photo.status)}`}>
                      {labelOf(moderationStatusLabels, photo.status)}
                    </p>
                  </div>
                  {photo.caption ? (
                    <p className="mt-1 text-sm text-slate-300">{photo.caption}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    با تأیید، امتیاز عکس به بازیکن اضافه می‌شود.
                  </p>
                  <ReviewActions
                    kind="photo"
                    id={photo.id}
                    eventId={eventId}
                    status={photo.status}
                  />
                </div>
              </div>
            </AdminCard>
          ))
        )}
      </div>
    </>
  );
}
