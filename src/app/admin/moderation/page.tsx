import { ModerationStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { ReviewActions } from "@/components/admin/review-actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { prisma } from "@/lib/prisma";
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { mediaPublicPath } from "@/modules/media/media.service";
import { getDisplayName } from "@/shared/privacy";

export default async function AdminModerationPage() {
  await requireEventManagerPage();

  const [feedback, photos] = await Promise.all([
    prisma.eventFeedback.findMany({
      where: { status: ModerationStatus.PENDING },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        },
        event: { select: { id: true, title: true, eventNumber: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.eventPhoto.findMany({
      where: { status: ModerationStatus.PENDING },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true
          }
        },
        event: { select: { id: true, title: true, eventNumber: true } }
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return (
    <>
      <PageTitle
        title="تأیید نظر و عکس"
        subtitle="بعد از تأیید، نظر و عکس روی برنامه دیده می‌شود. عکس تأییدشده امتیاز می‌دهد."
      />

      <h2 className="mb-3 font-black text-white">نظرات در انتظار</h2>
      <div className="mb-6 grid gap-3">
        {feedback.length === 0 ? (
          <AdminCard className="text-sm text-slate-400">
            نظر معلقی نیست.
          </AdminCard>
        ) : (
          feedback.map((item) => (
            <AdminCard key={item.id}>
              <p className="text-xs font-bold text-[#F39C12]">
                برنامه {item.event.eventNumber} — {item.event.title}
              </p>
              <p className="mt-1 font-black text-white">
                {getDisplayName(item.user)} · {item.rating} ستاره
              </p>
              {item.comment ? (
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {item.comment}
                </p>
              ) : null}
              <ReviewActions
                kind="feedback"
                id={item.id}
                eventId={item.eventId}
                status={item.status}
              />
              <Link
                href={`/admin/events/${item.eventId}/feedback` as Route}
                className="mt-2 inline-flex text-xs font-bold text-slate-400"
              >
                همه موارد این برنامه
              </Link>
            </AdminCard>
          ))
        )}
      </div>

      <h2 className="mb-3 font-black text-white">عکس‌های در انتظار</h2>
      <div className="grid gap-3">
        {photos.length === 0 ? (
          <AdminCard className="text-sm text-slate-400">
            عکس معلقی نیست.
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
                  <p className="text-xs font-bold text-[#F39C12]">
                    برنامه {photo.event.eventNumber} — {photo.event.title}
                  </p>
                  <p className="mt-1 font-black text-white">
                    {getDisplayName(photo.user)}
                  </p>
                  {photo.caption ? (
                    <p className="mt-1 text-sm text-slate-300">{photo.caption}</p>
                  ) : null}
                  <ReviewActions
                    kind="photo"
                    id={photo.id}
                    eventId={photo.eventId}
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
