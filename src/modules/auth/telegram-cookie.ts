export const TELEGRAM_INIT_COOKIE = "hm_tg_init";
export const TELEGRAM_INIT_HEADER = "x-telegram-init-data";
export const TELEGRAM_NEXT_COOKIE = "hm_tg_next";
export const TELEGRAM_LOGOUT_COOKIE = "hm_tg_logged_out";

/** Browser and signed session lifetime. Mini App init data uses the same window. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

export function telegramSessionCookieOptions() {
  return {
    httpOnly: true as const,
    // Telegram's WebView only keeps the session when the cookie is Secure + None.
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
      | "none"
      | "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

type CookieJar = {
  set: (options: { name: string; value: string } & Record<string, unknown>) => void;
};

export function applyTelegramSessionCookie(cookies: CookieJar, value: string) {
  cookies.set({
    name: TELEGRAM_LOGOUT_COOKIE,
    value: "",
    path: "/",
    maxAge: 0
  });
  cookies.set({
    name: TELEGRAM_INIT_COOKIE,
    value,
    ...telegramSessionCookieOptions()
  });
}

export function clearTelegramSessionCookie(cookies: CookieJar) {
  cookies.set({
    name: TELEGRAM_INIT_COOKIE,
    value: "",
    ...telegramSessionCookieOptions(),
    maxAge: 0
  });
}

export function markLoggedOutCookie(cookies: CookieJar) {
  cookies.set({
    name: TELEGRAM_LOGOUT_COOKIE,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}
