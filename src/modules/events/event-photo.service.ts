import { ModerationStatus, XPTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity, notifyUser } from "@/modules/activity/activity.service";
import { photoReviewedCopy } from "@/shared/notify-copy";
import { assertEventContributionAllowed } from "@/modules/events/event-contribution";
import { XPService } from "@/modules/gamification/xp.service";
import { MediaService } from "@/modules/media/media.service";
import { AppError } from "@/shared/errors";
import {
  MAX_EVENT_PHOTOS_PER_USER,
  MAX_EVENT_PHOTO_XP_PER_EVENT
} from "@/shared/event-photos";

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  photoUrl: true
} as const;

export class EventPhotoService {
  constructor(
    private readonly media = new MediaService(),
    private readonly xp = new XPService()
  ) {}

  async upload(input: {
    userId: string;
    eventId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    caption?: string | null;
  }) {
    await assertEventContributionAllowed(input.userId, input.eventId);

    const existing = await prisma.eventPhoto.count({
      where: { eventId: input.eventId, userId: input.userId }
    });
    if (existing >= MAX_EVENT_PHOTOS_PER_USER) {
      throw new AppError("PHOTO_LIMIT_REACHED", "Photo limit reached");
    }

    const asset = await this.media.createFromUpload({
      uploaderId: input.userId,
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType
    });

    return prisma.eventPhoto.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        mediaAssetId: asset.id,
        caption: input.caption?.trim() || null,
        status: ModerationStatus.PENDING
      }
    });
  }

  async listForEvent(eventId: string, status?: ModerationStatus) {
    return prisma.eventPhoto.findMany({
      where: { eventId, ...(status ? { status } : {}) },
      include: {
        user: { select: authorSelect },
        mediaAsset: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async listApproved(eventId: string) {
    return this.listForEvent(eventId, ModerationStatus.APPROVED);
  }

  async listMine(eventId: string, userId: string) {
    return prisma.eventPhoto.findMany({
      where: { eventId, userId },
      include: { mediaAsset: { select: { id: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async review(input: {
    photoId: string;
    reviewerId: string;
    status: ModerationStatus;
  }) {
    if (input.status === ModerationStatus.PENDING) {
      throw new AppError("VALIDATION_ERROR", "Invalid review status");
    }

    const photo = await prisma.eventPhoto.findUnique({
      where: { id: input.photoId },
      include: {
        event: { select: { id: true, title: true, eventNumber: true } }
      }
    });
    if (!photo) throw new AppError("NOT_FOUND", "Photo not found");

    const previous = photo.status;
    const updated = await prisma.eventPhoto.update({
      where: { id: input.photoId },
      data: {
        status: input.status,
        reviewedById: input.reviewerId,
        reviewedAt: new Date()
      }
    });

    let awardedXp = false;
    if (input.status === ModerationStatus.APPROVED) {
      const alreadyAwarded = await prisma.eventPhoto.count({
        where: {
          eventId: photo.eventId,
          userId: photo.userId,
          status: ModerationStatus.APPROVED,
          id: { not: photo.id }
        }
      });
      if (alreadyAwarded < MAX_EVENT_PHOTO_XP_PER_EVENT) {
        await this.xp.award(
          photo.userId,
          XPTransactionType.EVENT_PHOTO,
          "EventPhoto",
          photo.id,
          `عکس تأییدشده برنامه ${photo.event.eventNumber}`
        );
        awardedXp = true;
      }
    } else if (previous === ModerationStatus.APPROVED) {
      await this.xp.revoke(
        photo.userId,
        XPTransactionType.EVENT_PHOTO,
        "EventPhoto",
        photo.id
      );
    }

    await notifyUser({
      userId: photo.userId,
      type: "EVENT_PHOTO_REVIEWED",
      ...photoReviewedCopy({
        eventTitle: photo.event.title,
        approved: input.status === ModerationStatus.APPROVED,
        awardedXp
      }),
      eventPath: `/events/${photo.eventId}`
    });
    await logActivity({
      actorUserId: input.reviewerId,
      action: "EVENT_PHOTO_REVIEWED",
      entityType: "EventPhoto",
      entityId: photo.id,
      metadata: { status: input.status, eventId: photo.eventId }
    });

    return updated;
  }

  async pendingCount() {
    return prisma.eventPhoto.count({
      where: { status: ModerationStatus.PENDING }
    });
  }
}
