import { Prisma, PrismaClient, Role } from "@prisma/client";
import { defaultCommunitySlug } from "@/lib/config";
import type { TelegramUser } from "@/modules/auth/telegram";
import { APP_NAME, APP_SLOGAN } from "@/shared/brand";

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertTelegramUser(user: TelegramUser) {
    const community = await this.db.community.upsert({
      where: { slug: defaultCommunitySlug },
      update: {},
      create: { slug: defaultCommunitySlug, name: APP_NAME, tagline: APP_SLOGAN }
    });

    const telegramId = BigInt(user.id);
    const refresh = {
      username: user.username,
      languageCode: user.language_code,
      ...(user.photo_url ? { telegramPhotoUrl: user.photo_url } : {})
    };
    try {
      return await this.db.user.upsert({
        where: { telegramId },
        update: refresh,
        create: {
          communityId: community.id,
          telegramId,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          telegramPhotoUrl: user.photo_url,
          languageCode: user.language_code,
          profile: { create: {} },
          roles: { create: [{ role: Role.USER }] }
        },
        include: { roles: true, profile: true }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return this.db.user.update({
          where: { telegramId },
          data: refresh,
          include: { roles: true, profile: true }
        });
      }
      throw error;
    }
  }
}
