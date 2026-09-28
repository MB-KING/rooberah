import { RegistrationStatus } from "@prisma/client";
import { lockEventRow } from "@/lib/db-lock";
import { prisma } from "@/lib/prisma";
import { RegistrationRepository } from "@/modules/registrations/registration.repository";
import { AppError } from "@/shared/errors";
import { resolveRegistrationStatus } from "@/modules/registrations/registration.policy";
import { notifyUser } from "@/modules/activity/activity.service";
import {
  notifyGroupsOfSignup,
  refreshEventAnnouncementMessages
} from "@/modules/events/announce.service";
import { getDisplayName } from "@/shared/privacy";
import { assertRequiredTelegramMembership } from "@/modules/telegram/membership-gate";
import {
  registrationCancelledCopy,
  registrationConfirmedCopy,
  registrationWaitlistedCopy,
  waitlistPromotedCopy
} from "@/shared/notify-copy";

async function lockEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  eventId: string
) {
  const rows = await lockEventRow(tx, eventId);
  if (rows.length === 0) {
    throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  }
}

export class RegistrationService {
  async register(userId: string, eventId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        communityId: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true
      }
    });
    if (!user) {
      throw new AppError("UNAUTHORIZED", "User not found", 401);
    }
    await assertRequiredTelegramMembership({
      communityId: user.communityId,
      userId: user.id,
      telegramId: user.telegramId
    });

    const registration = await prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);

      const event = await tx.event.findFirst({
        where: { id: eventId, deletedAt: null }
      });
      if (!event) {
        throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
      }

      const repository = new RegistrationRepository(tx);
      const existing = await repository.findActive(userId, eventId);
      const count = await repository.countRegistered(eventId);
      const status = resolveRegistrationStatus({
        eventStatus: event.status,
        capacity: event.capacity,
        registeredCount: count,
        existingStatus: existing?.status
      });

      return {
        registration: await repository.upsertRegistered(userId, eventId, status),
        status,
        previousStatus: existing?.status ?? null,
        eventTitle: event.title,
        eventNumber: event.eventNumber,
        communityId: event.communityId
      };
    });

    const registeredCopy =
      registration.status === RegistrationStatus.WAITLISTED
        ? registrationWaitlistedCopy(registration.eventTitle)
        : registrationConfirmedCopy(registration.eventTitle);
    await notifyUser({
      userId,
      type: "REGISTRATION_UPDATED",
      ...registeredCopy,
      eventPath: `/events/${eventId}`
    });
    await refreshEventAnnouncementMessages(eventId).catch(() => undefined);
    if (
      registration.status === RegistrationStatus.REGISTERED &&
      registration.previousStatus !== RegistrationStatus.REGISTERED
    ) {
      await notifyGroupsOfSignup({
        communityId: registration.communityId,
        eventId,
        eventTitle: registration.eventTitle,
        eventNumber: registration.eventNumber,
        participantName: getDisplayName(user)
      }).catch(() => undefined);
    }

    return registration.registration;
  }

  async cancel(userId: string, eventId: string) {
    const result = await prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);

      const event = await tx.event.findFirst({
        where: { id: eventId, deletedAt: null }
      });
      if (!event) {
        throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
      }

      const repository = new RegistrationRepository(tx);
      const existing = await repository.findActive(userId, eventId);
      if (!existing || existing.status === RegistrationStatus.CANCELLED) {
        throw new AppError(
          "REGISTRATION_NOT_FOUND",
          "Registration not found",
          404
        );
      }

      const cancelled = await repository.cancel(userId, eventId);
      let promotedUserId: string | null = null;

      if (existing.status === RegistrationStatus.REGISTERED) {
        const waitlisted = await repository.findFirstWaitlisted(eventId);
        if (waitlisted) {
          await repository.promote(waitlisted.id);
          promotedUserId = waitlisted.userId;
        }
      }

      return {
        cancelled,
        eventTitle: event.title,
        eventNumber: event.eventNumber,
        communityId: event.communityId,
        promotedUserId
      };
    });

    await notifyUser({
      userId,
      type: "REGISTRATION_CANCELLED",
      ...registrationCancelledCopy(result.eventTitle),
      eventPath: `/events/${eventId}`
    });

    if (result.promotedUserId) {
      const promoted = await prisma.user.findUnique({
        where: { id: result.promotedUserId },
        select: { firstName: true, lastName: true, username: true }
      });
      await notifyUser({
        userId: result.promotedUserId,
        type: "WAITLIST_PROMOTED",
        ...waitlistPromotedCopy(result.eventTitle),
        eventPath: `/events/${eventId}`
      });
      if (promoted) {
        await notifyGroupsOfSignup({
          communityId: result.communityId,
          eventId,
          eventTitle: result.eventTitle,
          eventNumber: result.eventNumber,
          participantName: getDisplayName(promoted)
        }).catch(() => undefined);
      }
    }
    await refreshEventAnnouncementMessages(eventId).catch(() => undefined);

    return result.cancelled;
  }
}
