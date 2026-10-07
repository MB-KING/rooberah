export async function postTelegramInitData(initData: string) {
  const response = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData })
  });
  if (!response.ok) {
    throw new Error("telegram_login_failed");
  }
}

/** One full navigation so the session cookie is sent. Stops if this URL already reloaded. */
export function reloadAfterTelegramLogin(nextPath?: string) {
  const url = new URL(nextPath || window.location.href, window.location.origin);
  if (new URLSearchParams(window.location.search).get("auth") === "1") {
    return false;
  }
  url.searchParams.set("auth", "1");
  window.location.replace(`${url.pathname}${url.search}`);
  return true;
}
