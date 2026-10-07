import { prisma } from "@/lib/prisma";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { type TelegramUser } from "@/modules/auth/telegram";
import {
  validateTelegramLoginWidget,
  type TelegramLoginWidgetInput
} from "@/modules/auth/telegram-login";

export class AuthService {
  constructor(private readonly repository = new AuthRepository(prisma)) {}

  async loginWithTelegramWidget(payload: TelegramLoginWidgetInput) {
    const telegramUser = validateTelegramLoginWidget(payload);
    return this.repository.upsertTelegramUser(telegramUser);
  }

  async loginWithTelegramUser(telegramUser: TelegramUser) {
    return this.repository.upsertTelegramUser(telegramUser);
  }
}
