import {
  TelegramMembershipStatus,
  TelegramResourceType
} from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { lookupTelegramChatMember } from "@/lib/telegram-bot";
import { AppError } from "@/shared/errors";
import { trackMembershipUpdate } from "@/modules/telegram/group-commands";

export type RequiredTelegramResource = {
  id: string;
  name: string;
  link: string;
  type: TelegramResourceType;
};

const ACTIVE_STATUSES = new Set<TelegramMembershipStatus>([
  TelegramMembershipStatus.MEMBER,
  TelegramMembershipStatus.ADMIN,
  TelegramMembershipStatus.CREATOR
]);

export function mapTelegramApiStatus(status: string): TelegramMembershipStatus {
  switch (status) {
    case "member":
    case "restricted":
      return TelegramMembershipStatus.MEMBER;
    case "administrator":
      return TelegramMembershipStatus.ADMIN;
    case "creator":
      return TelegramMembershipStatus.CREATOR;
    case "left":
      return TelegramMembershipStatus.LEFT;
    case "kicked":
      return TelegramMembershipStatus.KICKED;
    default:
      return TelegramMembershipStatus.UNKNOWN;
  }
}

export function isActiveMembershipStatus(status: TelegramMembershipStatus) {
  return ACTIVE_STATUSES.has(status);
}

export async function getMissingRequiredMemberships(input: {
  communityId: string;
  userId: string;
  telegramId: bigint;
}): Promise<RequiredTelegramResource[]> {
  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { requireTelegramMembership: true }
  });
  if (!community?.requireTelegramMembership) {
    return [];
  }

  const resources = await prisma.telegramResource.findMany({
    where: {
      communityId: input.communityId,
      isActive: true,
      requiredForAccess: true,
      telegramChatId: { not: null }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  if (resources.length === 0) {
    return [];
  }

  const missing: RequiredTelegramResource[] = [];
  for (const resource of resources) {
    const isMember = await isMemberOfResource({
      resourceId: resource.id,
      chatId: resource.telegramChatId!,
      userId: input.userId,
      telegramId: input.telegramId
    });
    if (!isMember) {
      missing.push({
        id: resource.id,
        name: resource.name,
        link: resource.link,
        type: resource.type
      });
    }
  }
  return missing;
}

export async function assertRequiredTelegramMembership(input: {
  communityId: string;
  userId: string;
  telegramId: bigint;
}) {
  const missing = await getMissingRequiredMemberships(input);
  if (missing.length > 0) {
    throw new AppError(
      "MEMBERSHIP_REQUIRED",
      "User must join required Telegram resources"
    );
  }
}

async function isMemberOfResource(input: {
  resourceId: string;
  chatId: bigint;
  userId: string;
  telegramId: bigint;
}) {
  const live = await lookupTelegramChatMember(input.chatId, input.telegramId);
  if (live.kind === "status") {
    await trackMembershipUpdate({
      chatId: Number(input.chatId.toString()),
      telegramUserId: Number(input.telegramId.toString()),
      status: live.status
    });
    return isActiveMembershipStatus(mapTelegramApiStatus(live.status));
  }

  if (live.kind === "not_member") {
    await trackMembershipUpdate({
      chatId: Number(input.chatId.toString()),
      telegramUserId: Number(input.telegramId.toString()),
      status: "left"
    });
    return false;
  }

  const cached = await prisma.telegramGroupMembership.findUnique({
    where: {
      chatId_telegramUserId: {
        chatId: input.chatId,
        telegramUserId: input.telegramId
      }
    },
    select: { status: true }
  });
  if (cached) {
    return isActiveMembershipStatus(cached.status);
  }

  logger.warn("membership_unverified_fail_open", {
    resourceId: input.resourceId,
    userId: input.userId,
    reason: live.reason
  });
  return true;
}
