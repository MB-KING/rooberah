import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EventRepository } from "@/modules/events/event.repository";
import type { createEventSchema } from "@/modules/events/event.schema";
import type { z } from "zod";
import { AppError } from "@/shared/errors";
import { logActivity } from "@/modules/activity/activity.service";
import { BadgeService } from "@/modules/gamification/badge.service";
import { XPService } from "@/modules/gamification/xp.service";

export class EventService {
  constructor(
    private readonly repository = new EventRepository(prisma),
    private readonly xp = new XPService(),
    private readonly badges = new BadgeService()
  ) {}

  listPublished(take: number, skip: number) {
    return this.repository.findPublished(take, skip);
  }

  async getEvent(id: string) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
    }
    return event;
  }

  async getPublicEvent(id: string) {
    const event = await this.repository.findPublicById(id);
    if (!event) {
      throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
    }
    return event;
  }

  async createEvent(
    communityId: string,
    createdById: string,
    input: z.infer<typeof createEventSchema>
  ) {
    const event = await this.repository.create(communityId, createdById, input);
    await logActivity({
      actorUserId: createdById,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: event.id,
      metadata: { title: event.title }
    });
    return event;
  }

  async purgeEvent(eventId: string, actorUserId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        images: { select: { mediaAssetId: true } },
        photos: { select: { id: true, mediaAssetId: true } }
      }
    });
    if (!event) {
      throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
    }

    const photoIds = event.photos.map((photo) => photo.id);
    const mediaIds = [
      ...event.images.map((image) => image.mediaAssetId),
      ...event.photos.map((photo) => photo.mediaAssetId)
    ];

    const xpUserIds = await this.xp.revokeMatching({
      OR: [
        { referenceType: "Event", referenceId: eventId },
        ...(photoIds.length
          ? [{ referenceType: "EventPhoto", referenceId: { in: photoIds } }]
          : [])
      ]
    });

    const presentUsers = await prisma.attendance.findMany({
      where: { eventId, status: AttendanceStatus.PRESENT },
      select: { userId: true }
    });

    await prisma.$transaction([
      prisma.eventRegistration.deleteMany({ where: { eventId } }),
      prisma.attendance.deleteMany({ where: { eventId } }),
      prisma.event.delete({ where: { id: eventId } })
    ]);

    if (mediaIds.length > 0) {
      await prisma.mediaAsset.deleteMany({
        where: {
          id: { in: mediaIds },
          eventImages: { none: {} },
          eventPhotos: { none: {} }
        }
      });
    }

    const badgeUsers = new Set([
      ...xpUserIds,
      ...presentUsers.map((row) => row.userId)
    ]);
    for (const userId of badgeUsers) {
      await this.badges.evaluateAttendanceBadges(userId);
    }

    await logActivity({
      actorUserId,
      action: "EVENT_PURGED",
      entityType: "Event",
      entityId: eventId,
      metadata: { title: event.title, eventNumber: event.eventNumber }
    });
  }
}
