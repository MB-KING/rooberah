import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { prisma } from "@/lib/prisma";
import {
  TELEGRAM_INIT_COOKIE,
  TELEGRAM_INIT_HEADER
} from "@/modules/auth/telegram-cookie";
import { validateTelegramInitData } from "@/modules/auth/telegram";
import {
  isTelegramLoginWidgetPayload,
  validateTelegramLoginWidget
} from "@/modules/auth/telegram-login";
import {
  isTelegramOidcSessionPayload,
  validateTelegramOidcSession
} from "@/modules/auth/telegram-oidc";
import { AppError } from "@/shared/errors";

function isDevAuthAllowed() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_AUTH === "true"
  );
}

async function resolveDevUser() {
  if (!isDevAuthAllowed()) {
    return null;
  }

  const devTelegramId = process.env.DEV_TELEGRAM_ID?.trim();
  if (!devTelegramId) {
    return null;
  }

  return prisma.user.findFirst({
    where: { telegramId: BigInt(devTelegramId), deletedAt: null },
    include: { roles: true }
  });
}

async function readInitData() {
  const headerValue = (await headers()).get(TELEGRAM_INIT_HEADER)?.trim();
  if (headerValue) {
    return headerValue;
  }

  const cookieValue = (await cookies()).get(TELEGRAM_INIT_COOKIE)?.value;
  return cookieValue?.trim() || null;
}

export async function requireCurrentUser() {
  const devUser = await resolveDevUser();
  if (devUser) {
    return devUser;
  }

  const initData = await readInitData();
  if (!initData) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram init data", 401);
  }

  const telegramUser = isTelegramOidcSessionPayload(initData)
    ? validateTelegramOidcSession(initData)
    : isTelegramLoginWidgetPayload(initData)
      ? validateTelegramLoginWidget(initData)
      : validateTelegramInitData(initData);
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramUser.id) },
    include: { roles: true }
  });

  if (!user || user.deletedAt) {
    throw new AppError("UNAUTHORIZED", "User not found", 401);
  }

  const nextPhotoUrl = telegramUser.photo_url ?? null;
  // Keep custom display names; only refresh Telegram username/photo.
  if (
    nextPhotoUrl !== user.photoUrl ||
    (telegramUser.username ?? null) !== user.username
  ) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        photoUrl: nextPhotoUrl,
        username: telegramUser.username ?? null
      },
      include: { roles: true }
    });
  }

  return user;
}

export async function getOptionalCurrentUser() {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return null;
    }
    throw error;
  }
}

export async function redirectToTelegramLogin(): Promise<never> {
  const currentPath = (await headers()).get("x-rooberah-path");
  const next = safeInternalPath(currentPath);
  if (next === "/") {
    redirect("/open-in-telegram");
  }
  redirect(
    `/open-in-telegram?next=${encodeURIComponent(next)}` as never
  );
}

export async function requireCurrentUserPage() {
  const user = await getOptionalCurrentUser();
  if (!user) {
    return redirectToTelegramLogin();
  }
  return user;
}
