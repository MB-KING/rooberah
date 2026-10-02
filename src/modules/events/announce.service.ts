import {
  EventStatus,
  Prisma,
  RegistrationStatus,
  TelegramResourceType
} from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  appPublicUrl,
  deleteTelegramMessage,
  editTelegramAnnouncement,
  editTelegramPhoto,
  pinTelegramMessage,
  sendTelegramMessage,
  sendTelegramPhoto
} from "@/lib/telegram-bot";
import {
  formatEventAnnounceHtml,
  formatGroupSignupHtml,
  isPermanentTelegramChatError
} from "@/lib/telegram-format";
import { getDisplayName } from "@/shared/privacy";
import { notifyButtons, TELEGRAM_CAPTION_LIMIT } from "@/shared/notify-copy";

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
  announceThreadId?: number | null;
};

export type AnnounceSummary = {
  sent: number;
  skipped: number;
  failed: number;
  disabled: boolean;
  noTargets: boolean;
};

async function loadAnnounceEvent(eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: {
      id: true,
      communityId: true,
      title: true,
      eventNumber: true,
      date: true,
      meetingTime: true,
      startTime: true,
      locationName: true,
      description: true,
      status: true,
      announceThreadId: true
    }
  });
}

async function loadParticipantNames(eventId: string) {
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId, status: RegistrationStatus.REGISTERED },
    orderBy: { registeredAt: "asc" },
    select: {
      user: {
        select: { firstName: true, lastName: true, username: true }
      }
    }
  });
  return registrations.map((row) => getDisplayName(row.user));
}

type AnnounceBody = Pick<
  AnnounceEvent,
  | "title"
  | "eventNumber"
  | "date"
  | "meetingTime"
  | "startTime"
  | "locationName"
  | "description"
>;

function threadForResource(
  resource: {
    type: TelegramResourceType;
    telegramThreadId: number | null;
    forumTopics?: Array<{ threadId: number }>;
  },
  announceThreadId?: number | null
) {
  if (resource.type !== TelegramResourceType.GROUP) return null;
  if (
    announceThreadId &&
    resource.forumTopics?.some((topic) => topic.threadId === announceThreadId)
  ) {
    return announceThreadId;
  }
  return resource.telegramThreadId;
}

function announceText(event: AnnounceBody, participantNames: string[] = []) {
  return formatEventAnnounceHtml(event, { participantNames });
}

async function sendAnnounceMessage(input: {
  chatId: bigint;
  eventId: string;
  event: AnnounceBody;
  text: string;
  photoFileId: string | null;
  threadId: number | null;
}) {
  const button = {
    openApp: true as const,
    eventPath: `/events/${input.eventId}`,
    buttonText: notifyButtons.signup,
    threadId: input.threadId
  };

  if (input.photoFileId && input.text.length <= TELEGRAM_CAPTION_LIMIT) {
    return sendTelegramPhoto({
      chatId: input.chatId,
      photoFileId: input.photoFileId,
      caption: input.text,
      ...button
    });
  }

  if (input.photoFileId) {
    await sendTelegramPhoto({
      chatId: input.chatId,
      photoFileId: input.photoFileId,
      caption: announceText(input.event),
      ...button
    });
  }

  return sendTelegramMessage({
    chatId: input.chatId,
    text: input.text,
    parseMode: "HTML",
    ...button
  });
}

async function editOrResendAnnounce(input: {
  chatId: bigint;
  messageId: number;
  eventId: string;
  text: string;
  threadId: number | null;
}) {
  const edited = await editTelegramAnnouncement({
    chatId: input.chatId,
    messageId: input.messageId,
    text: input.text,
    eventPath: `/events/${input.eventId}`,
    buttonText: notifyButtons.signup
  });
  if (edited.ok) return edited;

  return sendTelegramMessage({
    chatId: input.chatId,
    text: input.text,
    parseMode: "HTML",
    openApp: true,
    eventPath: `/events/${input.eventId}`,
    buttonText: notifyButtons.signup,
    threadId: input.threadId
  });
}

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
      },
      include: { forumTopics: { select: { threadId: true } } }
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
    const participantNames = await loadParticipantNames(event.id);
    const text = announceText(event, participantNames);

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
          const existing = await prisma.eventAnnouncement.findUnique({
            where: {
              eventId_resourceId: {
                eventId: event.id,
                resourceId: resource.id
              }
            },
            select: { telegramMessageId: true }
          });
            if (existing?.telegramMessageId) {
            const edited = await editOrResendAnnounce({
              chatId: resource.telegramChatId,
              messageId: Number(existing.telegramMessageId),
              eventId: event.id,
              text,
              threadId: threadForResource(resource, event.announceThreadId)
            });
            if (edited.ok) {
              if (edited.messageId !== Number(existing.telegramMessageId)) {
                await prisma.eventAnnouncement.update({
                  where: {
                    eventId_resourceId: {
                      eventId: event.id,
                      resourceId: resource.id
                    }
                  },
                  data: { telegramMessageId: String(edited.messageId) }
                });
              }
              await pinTelegramMessage({
                chatId: resource.telegramChatId,
                messageId: edited.messageId
              });
            }
          }
          summary.skipped += 1;
          continue;
        }
        throw error;
      }

      const result = await sendAnnounceMessage({
        chatId: resource.telegramChatId,
        eventId: event.id,
        event,
        text,
        photoFileId,
        threadId: threadForResource(resource, event.announceThreadId)
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
      await pinTelegramMessage({
        chatId: resource.telegramChatId,
        messageId: result.messageId
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

export async function notifyGroupsOfSignup(input: {
  communityId: string;
  eventId: string;
  eventTitle: string;
  eventNumber: number;
  participantName: string;
}) {
  try {
    const community = await prisma.community.findUnique({
      where: { id: input.communityId },
      select: { autoAnnounceEnabled: true }
    });
    if (!community?.autoAnnounceEnabled) return;

    const posted = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { announceThreadId: true }
    });
    const groups = await prisma.telegramResource.findMany({
      where: {
        communityId: input.communityId,
        type: TelegramResourceType.GROUP,
        isActive: true,
        receiveAnnouncements: true,
        telegramChatId: { not: null }
      },
      include: { forumTopics: { select: { threadId: true } } }
    });
    const text = formatGroupSignupHtml({
      name: input.participantName,
      eventTitle: input.eventTitle,
      eventNumber: input.eventNumber
    });

    await Promise.all(
      groups.map((group) => {
        if (!group.telegramChatId) return Promise.resolve();
        return sendTelegramMessage({
          chatId: group.telegramChatId,
          text,
          parseMode: "HTML",
          openApp: true,
          eventPath: `/events/${input.eventId}`,
          buttonText: notifyButtons.signup,
          threadId: threadForResource(group, posted?.announceThreadId)
        });
      })
    );
  } catch (error) {
    logger.warn("group_signup_notify_failed", {
      eventId: input.eventId,
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}

export async function refreshEventAnnouncementMessages(eventId: string) {
  const event = await loadAnnounceEvent(eventId);
  if (!event || event.status === EventStatus.CANCELLED) return;

  try {
    const announcements = await prisma.eventAnnouncement.findMany({
      where: {
        eventId,
        telegramMessageId: { not: null },
        resource: { isActive: true, telegramChatId: { not: null } }
      },
      include: {
        resource: {
          select: {
            type: true,
            telegramChatId: true,
            telegramThreadId: true,
            forumTopics: { select: { threadId: true } }
          }
        }
      }
    });
    if (announcements.length === 0) return;

    const text = announceText(event, await loadParticipantNames(eventId));

    await Promise.all(
      announcements.map(async (row) => {
        if (!row.resource.telegramChatId || !row.telegramMessageId) {
          return;
        }
        const edited = await editOrResendAnnounce({
          chatId: row.resource.telegramChatId,
          messageId: Number(row.telegramMessageId),
          eventId: event.id,
          text,
          threadId: threadForResource(row.resource, event.announceThreadId)
        });
        if (edited.ok && edited.messageId !== Number(row.telegramMessageId)) {
          await prisma.eventAnnouncement.update({
            where: { id: row.id },
            data: { telegramMessageId: String(edited.messageId) }
          });
        }
      })
    );
  } catch (error) {
    logger.warn("event_announce_refresh_failed", {
      eventId,
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}

function noMediaToEdit(reason: string) {
  const text = reason.toLowerCase();
  return (
    text.includes("no media") ||
    text.includes("message can't be edited") ||
    text.includes("there is no caption") ||
    text.includes("message to edit not found")
  );
}

export async function refreshAnnouncementCover(eventId: string) {
  const event = await loadAnnounceEvent(eventId);
  if (!event || event.status === EventStatus.CANCELLED) return;

  const cover = await prisma.eventImage.findFirst({
    where: { eventId },
    orderBy: { sortOrder: "desc" },
    include: { mediaAsset: { select: { telegramFileId: true } } }
  });
  const photoFileId = cover?.mediaAsset.telegramFileId ?? null;
  if (!photoFileId) return;

  const announcements = await prisma.eventAnnouncement.findMany({
    where: {
      eventId,
      telegramMessageId: { not: null },
      resource: { isActive: true, telegramChatId: { not: null } }
    },
    include: {
      resource: {
        select: {
          type: true,
          telegramChatId: true,
          telegramThreadId: true,
          forumTopics: { select: { threadId: true } }
        }
      }
    }
  });
  const names = await loadParticipantNames(eventId);
  const text = announceText(event, names);
  const caption =
    text.length <= TELEGRAM_CAPTION_LIMIT ? text : announceText(event);

  for (const row of announcements) {
    if (!row.resource.telegramChatId || !row.telegramMessageId) continue;
    const chatId = row.resource.telegramChatId;
    const messageId = Number(row.telegramMessageId);
    const threadId = threadForResource(row.resource, event.announceThreadId);
    const edited = await editTelegramPhoto({
      chatId,
      messageId,
      photoFileId,
      caption,
      eventPath: `/events/${event.id}`,
      buttonText: notifyButtons.signup
    });
    if (edited.ok) {
      await pinTelegramMessage({ chatId, messageId });
      continue;
    }
    if (!noMediaToEdit(edited.reason)) continue;

    await deleteTelegramMessage({ chatId, messageId });
    const sent = await sendTelegramPhoto({
      chatId,
      photoFileId,
      caption,
      openApp: true,
      eventPath: `/events/${event.id}`,
      buttonText: notifyButtons.signup,
      threadId
    });
    if (!sent.ok) continue;
    await prisma.eventAnnouncement.update({
      where: { id: row.id },
      data: { telegramMessageId: String(sent.messageId) }
    });
    await pinTelegramMessage({ chatId, messageId: sent.messageId });
  }
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
