import { PrismaClient, Role } from "@prisma/client";
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

    return this.db.user.upsert({
      where: { telegramId: BigInt(user.id) },
      update: {
        username: user.username,
        photoUrl: user.photo_url,
        languageCode: user.language_code
      },
      create: {
        communityId: community.id,
        telegramId: BigInt(user.id),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        languageCode: user.language_code,
        profile: { create: {} },
        roles: { create: [{ role: Role.USER }] }
      },
      include: { roles: true, profile: true }
    });
  }
}
