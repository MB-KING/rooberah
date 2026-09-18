import { EventStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  appPublicUrl,
  sendTelegramMessage,
  sendTelegramPhoto
} from "@/lib/telegram-bot";
import {
  formatEventAnnounceHtml,
  isPermanentTelegramChatError
} from "@/lib/telegram-format";
import { notifyButtons } from "@/shared/notify-copy";

type AnnounceEvent = {
  id: string;
  communityId: string;
  title: string;
  eventNumber: number;
  date: Date;
  meetingTime: Date;
  startTime: Date;
  locationName: string;
  description: string | null;
  status: EventStatus;
};

export type AnnounceSummary = {
  sent: number;
  skipped: number;
  failed: number;
  disabled: boolean;
  noTargets: boolean;
};

async function deactivateAnnounceTarget(resourceId: string, reason: string) {
  await prisma.telegramResource.update({
    where: { id: resourceId },
    data: { isActive: false, receiveAnnouncements: false }
  });
  logger.warn("event_announce_target_disabled", { resourceId, reason });
}

export async function announcePublishedEvent(
  event: AnnounceEvent
): Promise<AnnounceSummary> {
  const summary: AnnounceSummary = {
    sent: 0,
    skipped: 0,
    failed: 0,
    disabled: false,
    noTargets: false
  };

  if (event.status !== EventStatus.PUBLISHED) return summary;

  try {
    const community = await prisma.community.findUnique({
      where: { id: event.communityId },
      select: { autoAnnounceEnabled: true }
    });
    if (!community?.autoAnnounceEnabled) {
      summary.disabled = true;
      logger.info("event_announce_skipped_disabled", { eventId: event.id });
      return summary;
    }

    const resources = await prisma.telegramResource.findMany({
      where: {
        communityId: event.communityId,
        isActive: true,
        receiveAnnouncements: true,
        telegramChatId: { not: null }
      }
    });

    if (resources.length === 0) {
      summary.noTargets = true;
      logger.warn("event_announce_no_targets", { eventId: event.id });
      return summary;
    }

    const cover = await prisma.eventImage.findFirst({
      where: { eventId: event.id },
      orderBy: { sortOrder: "asc" },
      include: {
        mediaAsset: { select: { telegramFileId: true } }
      }
    });
    const photoFileId = cover?.mediaAsset.telegramFileId ?? null;
    const text = formatEventAnnounceHtml(event);

    for (const resource of resources) {
      if (!resource.telegramChatId) continue;

      try {
        await prisma.eventAnnouncement.create({
          data: {
            eventId: event.id,
            resourceId: resource.id
          }
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          summary.skipped += 1;
          continue;
        }
        throw error;
      }

      const result = photoFileId
        ? await sendTelegramPhoto({
            chatId: resource.telegramChatId,
            photoFileId,
            caption: text,
            openApp: true,
            eventPath: `/events/${event.id}`,
            buttonText: notifyButtons.signup
          })
        : await sendTelegramMessage({
            chatId: resource.telegramChatId,
            text,
            parseMode: "HTML",
            openApp: true,
            eventPath: `/events/${event.id}`,
            buttonText: notifyButtons.signup
          });

      if (!result.ok) {
        summary.failed += 1;
        await prisma.eventAnnouncement.delete({
          where: {
            eventId_resourceId: {
              eventId: event.id,
              resourceId: resource.id
            }
          }
        }).catch(() => undefined);

        logger.warn("event_announce_failed", {
          eventId: event.id,
          resourceId: resource.id,
          chatId: resource.telegramChatId.toString(),
          reason: result.reason
        });

        if (isPermanentTelegramChatError(result.reason)) {
          await deactivateAnnounceTarget(resource.id, result.reason);
        }
        continue;
      }

      await prisma.eventAnnouncement.update({
        where: {
          eventId_resourceId: {
            eventId: event.id,
            resourceId: resource.id
          }
        },
        data: { telegramMessageId: String(result.messageId) }
      });
      summary.sent += 1;
      logger.info("event_announce_sent", {
        eventId: event.id,
        resourceId: resource.id,
        chatId: resource.telegramChatId.toString(),
        messageId: result.messageId
      });
    }
  } catch (error) {
    summary.failed += 1;
    logger.warn("event_announce_unexpected", {
      eventId: event.id,
      reason: error instanceof Error ? error.message : "unknown",
      appUrl: appPublicUrl()
    });
  }

  return summary;
}

export function announceFlashQuery(summary: AnnounceSummary): string | null {
  if (summary.disabled) {
    return "announce=disabled";
  }
  if (summary.noTargets) {
    return "announce=no_targets";
  }
  if (summary.failed > 0 && summary.sent === 0) {
    return `announce=failed&failed=${summary.failed}`;
  }
  if (summary.sent > 0) {
    return `announce=sent&sent=${summary.sent}${summary.failed > 0 ? `&failed=${summary.failed}` : ""}`;
  }
  if (summary.skipped > 0) {
    return "announce=already";
  }
  return null;
}
