import {
  CalendarDays,
  Clock,
  Flag,
  Images,
  MapPin,
  MessageSquareText,
  Star,
  UsersRound
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { EventActions } from "@/components/user/event-actions";
import { EventPhotoUploadForm } from "@/components/user/event-photo-upload";
import { FeedbackForm } from "@/components/user/feedback-form";
import { NavigationSheet } from "@/components/user/navigation-sheet";
import { ParticipantsPreview } from "@/components/user/participants-preview";
import { PhotoLightbox } from "@/components/user/photo-lightbox";
import { ReferralCapture } from "@/components/user/referral-capture";
import { ShareCardButton } from "@/components/user/share-card-button";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { miniAppWidthClass } from "@/components/user/mini-app";
import { prisma } from "@/lib/prisma";
import {
  faTehranDateFormatter,
  faTehranTimeFormatter
} from "@/lib/tehran-time";
import { getOptionalCurrentUser } from "@/modules/auth/session";
import { EventPhotoService } from "@/modules/events/event-photo.service";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { FeedbackService } from "@/modules/feedback/feedback.service";
import { mediaPublicPath } from "@/modules/media/media.service";
import { APP_NAME } from "@/shared/brand";
import { MEETING_TIME_LABEL, START_TIME_LABEL } from "@/shared/copy";
import { errorMessagesFa, type ErrorCode } from "@/shared/errors";
import {
  eventStatusLabels,
  labelOf,
  moderationStatusLabels
} from "@/shared/labels";
import { getDisplayName } from "@/shared/privacy";
import {
  eventReferralUrl,
  eventShareCardUrl,
  eventShareDetailsText,
  eventShareText,
  publicAppUrl,
  shareDetailsFromEvent
} from "@/shared/share";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ ref?: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const { ref } = await searchParams;
  const referrerId = ref && UUID_RE.test(ref) ? ref : null;
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    select: { id: true, title: true, description: true }
  });

  if (!event) {
    return { title: APP_NAME };
  }

  const pageUrl = eventReferralUrl(event.id, referrerId);
  const imageUrl = eventShareCardUrl(event.id, {
    format: "landscape",
    userId: referrerId
  });
  const description =
    event.description?.trim().slice(0, 160) || eventShareText(event.title);

  return {
    title: event.title,
    description,
    metadataBase: new URL(publicAppUrl()),
    openGraph: {
      title: event.title,
      description: eventShareText(event.title),
      url: pageUrl,
      locale: "fa_IR",
      type: "website",
      images: [
        { url: imageUrl, width: 1200, height: 630, alt: event.title }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: eventShareText(event.title),
      images: [imageUrl]
    }
  };
}

const dateFormatter = faTehranDateFormatter;
const timeFormatter = faTehranTimeFormatter;

export default async function EventDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    error?: string;
    ok?: string;
    register?: string;
    ref?: string;
  }>;
}) {
  const user = await getOptionalCurrentUser();
  const { eventId } = await params;
  const { error, ok, register } = await searchParams;
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    include: {
      registrations: user
        ? { where: { userId: user.id }, select: { status: true } }
        : false,
      images: {
        orderBy: { sortOrder: "asc" },
        include: { mediaAsset: true }
      },
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
          attendance: { where: { status: "PRESENT" } }
        }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const previewRegs = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: "REGISTERED",
      user: { profile: { showInMembersDirectory: true } }
    },
    orderBy: { registeredAt: "asc" },
    take: 3,
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          photoUrl: true
        }
      }
    }
  });

  const registrationCount = event._count.registrations;
  const remainingCapacity =
    event.capacity == null
      ? null
      : Math.max(event.capacity - registrationCount, 0);
  const registrationStatus = Array.isArray(event.registrations)
    ? event.registrations[0]?.status
    : undefined;

  const feedbackService = new FeedbackService();
  const photoService = new EventPhotoService();
  const [attendance, feedback, approvedFeedback, approvedPhotos, myPhotos, feedbackStats] =
    await Promise.all([
      user
        ? prisma.attendance.findUnique({
            where: { userId_eventId: { userId: user.id, eventId } }
          })
        : Promise.resolve(null),
      user
        ? prisma.eventFeedback.findUnique({
            where: { eventId_userId: { eventId, userId: user.id } }
          })
        : Promise.resolve(null),
      event.status === "COMPLETED"
        ? feedbackService.listApproved(eventId)
        : Promise.resolve([]),
      event.status === "COMPLETED"
        ? photoService.listApproved(eventId)
        : Promise.resolve([]),
      user && event.status === "COMPLETED"
        ? photoService.listMine(eventId, user.id)
        : Promise.resolve([]),
      event.status === "COMPLETED"
        ? feedbackService.statsForEvent(eventId, true)
        : Promise.resolve({ average: 0, count: 0 })
    ]);

  const canContribute =
    event.status === "COMPLETED" && attendance?.status === "PRESENT";
  const isCompleted = event.status === "COMPLETED";

  return (
    <UserPageShell
      contentClassName={
        isCompleted
          ? undefined
          : "pb-[calc(10.5rem+env(safe-area-inset-bottom))]"
      }
    >
      <ReferralCapture />
      <UserPageHeader
        title={event.title}
        subtitle={event.description ?? undefined}
        backFallbackHref="/events"
      />

      {error && error in errorMessagesFa ? (
        <UserCard className="mb-4 border-red-400/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-200">
            {errorMessagesFa[error as ErrorCode]}
          </p>
        </UserCard>
      ) : null}
      {ok === "registered" ? (
        <UserCard className="mb-4 border-emerald-400/30 bg-emerald-500/10">
          <p className="text-sm font-bold text-emerald-200">
            ثبت‌نام با موفقیت انجام شد.
          </p>
        </UserCard>
      ) : null}
      {ok === "cancelled" ? (
        <UserCard className="mb-4 border-sky-400/30 bg-sky-500/10">
          <p className="text-sm font-bold text-sky-200">ثبت‌نام لغو شد.</p>
        </UserCard>
      ) : null}
      {ok === "feedback" ? (
        <UserCard className="mb-4 border-emerald-400/30 bg-emerald-500/10">
          <p className="text-sm font-bold text-emerald-200">
            نظرت ثبت شد و بعد از تأیید ادمین نمایش داده می‌شود.
          </p>
        </UserCard>
      ) : null}

      {event.images.length > 0 ? (
        <UserCard className="mb-4 overflow-hidden p-0">
          <div className="relative aspect-[16/10] w-full bg-pine">
            <Image
              src={mediaPublicPath(event.images[0].mediaAssetId)}
              alt={event.images[0].caption ?? event.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          {event.images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-3">
              {event.images.slice(1).map((image) => (
                <div
                  key={image.id}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg"
                >
                  <Image
                    src={mediaPublicPath(image.mediaAssetId)}
                    alt={image.caption ?? event.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}
        </UserCard>
      ) : null}

      <UserCard className="mb-4 border-ember/25 bg-pine">
        <p className="text-sm font-bold text-ember">
          برنامه شماره {event.eventNumber}
        </p>
        <div className="mt-4 grid gap-3">
          <Info
            icon={<CalendarDays size={18} />}
            label="تاریخ برنامه"
            value={dateFormatter.format(event.date)}
          />
          <Info
            icon={<Clock size={18} />}
            label={MEETING_TIME_LABEL}
            value={timeFormatter.format(event.meetingTime)}
            tone="accent"
          />
          <Info
            icon={<Flag size={18} />}
            label={START_TIME_LABEL}
            value={timeFormatter.format(event.startTime)}
            tone="accent"
          />
        </div>
      </UserCard>

      <UserCard>
        <h2 className="font-black text-white">اطلاعات برنامه</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-300">
          <Info
            icon={<MapPin size={18} />}
            label="محل قرار"
            value={event.locationName}
          />
          <Info
            icon={<MapPin size={18} />}
            label="آدرس"
            value={event.locationAddress ?? "هنوز ثبت نشده"}
          />
          <Info
            icon={<UsersRound size={18} />}
            label="ثبت‌نام‌شده‌ها"
            value={`${registrationCount} نفر`}
          />
          {isCompleted ? null : (
            <Info
              icon={<UsersRound size={18} />}
              label="ظرفیت باقی‌مانده"
              value={
                remainingCapacity == null
                  ? "بدون محدودیت"
                  : `${remainingCapacity} نفر`
              }
            />
          )}
          <Info
            label="وضعیت برنامه"
            value={labelOf(eventStatusLabels, event.status)}
          />
        </dl>
        <ParticipantsPreview
          eventId={event.id}
          total={registrationCount}
          users={previewRegs.map((row) => row.user)}
        />
        {event.latitude != null && event.longitude != null ? (
          <NavigationSheet
            latitude={Number(event.latitude)}
            longitude={Number(event.longitude)}
          />
        ) : null}
        <ShareCardButton
          eventId={event.id}
          userId={user?.id}
          shareUrl={eventReferralUrl(event.id, user?.id)}
          shareText={eventShareDetailsText(shareDetailsFromEvent(event))}
          telegramShareText={eventShareText(event.title)}
        />
      </UserCard>

      {canContribute ? (
        <UserCard className="mt-4">
          <h2 className="flex items-center gap-2 font-black text-white">
            <MessageSquareText size={18} className="text-ember" />
            نظر درباره این برنامه
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            حضورت تأیید شده؛ تجربه‌ات را بنویس تا بعد از تأیید ادمین دیده شود.
          </p>
          <FeedbackForm eventId={event.id} existing={feedback} />
        </UserCard>
      ) : null}

      {canContribute ? (
        <UserCard className="mt-4">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Images size={18} className="text-ember" />
            عکس‌های تو از این برنامه
          </h2>
          {myPhotos.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {myPhotos.map((photo) => (
                <PhotoLightbox
                  key={photo.id}
                  src={mediaPublicPath(photo.mediaAssetId)}
                  alt={photo.caption ?? "عکس برنامه"}
                  caption={labelOf(moderationStatusLabels, photo.status)}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={mediaPublicPath(photo.mediaAssetId)}
                      alt={photo.caption ?? "عکس برنامه"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="px-2 py-1.5 text-xs font-bold text-slate-300">
                    {labelOf(moderationStatusLabels, photo.status)}
                  </p>
                </PhotoLightbox>
              ))}
            </div>
          ) : null}
          <EventPhotoUploadForm
            eventId={event.id}
            uploadedCount={myPhotos.length}
          />
        </UserCard>
      ) : null}

      {event.status === "COMPLETED" ? (
        <UserCard className="mt-4">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Star size={18} className="text-ember" />
            نظرات همراهان
          </h2>
          {feedbackStats.count > 0 ? (
            <p className="mt-1 text-sm text-slate-400">
              میانگین {feedbackStats.average.toFixed(1)} از{" "}
              {feedbackStats.count.toLocaleString("fa-IR")} نظر تأییدشده
            </p>
          ) : null}
          <div className="mt-3 grid gap-3">
            {approvedFeedback.length === 0 ? (
              <p className="text-sm text-slate-400">
                هنوز نظر تأییدشده‌ای نیست.
              </p>
            ) : (
              approvedFeedback.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.05] p-3"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      photoUrl={item.user.photoUrl}
                      name={getDisplayName(item.user)}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-white">
                        {getDisplayName(item.user)}
                      </p>
                      <p className="text-xs font-bold text-ember">
                        {item.rating} ستاره
                      </p>
                    </div>
                  </div>
                  {item.comment ? (
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {item.comment}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </UserCard>
      ) : null}

      {event.status === "COMPLETED" ? (
        <UserCard className="mt-4">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Images size={18} className="text-ember" />
            آرشیو عکس‌های همراهان
          </h2>
          {approvedPhotos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              هنوز عکس تأییدشده‌ای در آرشیو نیست.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {approvedPhotos.map((photo) => (
                <PhotoLightbox
                  key={photo.id}
                  src={mediaPublicPath(photo.mediaAssetId)}
                  alt={photo.caption ?? event.title}
                  caption={photo.caption || getDisplayName(photo.user)}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={mediaPublicPath(photo.mediaAssetId)}
                      alt={photo.caption ?? event.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs font-bold text-slate-300">
                    {photo.caption || getDisplayName(photo.user)}
                  </p>
                </PhotoLightbox>
              ))}
            </div>
          )}
        </UserCard>
      ) : null}

      {isCompleted ? null : (
        <div
          className={`fixed bottom-[calc(4.1rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-full -translate-x-1/2 px-4 ${miniAppWidthClass}`}
        >
          <div className="rounded-2xl border border-white/10 bg-night/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <EventActions
              eventId={event.id}
              registrationStatus={registrationStatus}
              requiresLogin={!user}
              autoRegister={Boolean(
                user && register === "1" && !registrationStatus
              )}
            />
          </div>
        </div>
      )}
    </UserPageShell>
  );
}

function Info({
  label,
  value,
  icon,
  tone = "default"
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={
        tone === "accent"
          ? "rounded-xl bg-ember/15 p-3 ring-1 ring-ember/25"
          : "rounded-xl bg-white/10 p-3"
      }
    >
      <dt className="flex items-center gap-2 text-xs font-bold text-ember">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-bold text-white">{value}</dd>
    </div>
  );
}
