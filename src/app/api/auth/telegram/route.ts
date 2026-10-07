import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { validateTelegramInitData } from "@/modules/auth/telegram";
import {
  applyTelegramSessionCookie,
  TELEGRAM_LOGOUT_COOKIE
} from "@/modules/auth/telegram-cookie";
import { serializeTelegramOidcSession } from "@/modules/auth/telegram-oidc";
import { ok, fail, parseJson } from "@/shared/api";
import { z } from "zod";

const schema = z.object({
  initData: z.string().min(20)
});

export async function POST(request: Request) {
  const loggedOut = (await cookies()).get(TELEGRAM_LOGOUT_COOKIE)?.value === "1";
  if (loggedOut) {
    return NextResponse.json({ code: "LOGGED_OUT" }, { status: 403 });
  }

  try {
    const input = await parseJson(request, schema);
    const telegramUser = validateTelegramInitData(input.initData);
    const user = await new AuthService().loginWithTelegramUser(telegramUser);

    const response = ok({
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((role) => role.role)
    });

    // Raw init data is often larger than a cookie, so the WebView drops it
    // and the next page still looks logged out.
    applyTelegramSessionCookie(
      response.cookies,
      serializeTelegramOidcSession(telegramUser)
    );
    return response;
  } catch (error) {
    return fail(error);
  }
}
