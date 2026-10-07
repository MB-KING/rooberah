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
