const RELOAD_KEY = "rooberah_session_reload";

export function telegramLoginAlreadyRetried() {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

/** Full navigation so the new session cookie is actually sent. Only once. */
export function reloadAfterTelegramLogin(nextPath?: string) {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return false;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    // continue; a reload is still better than staying on the spinner
  }

  if (nextPath && nextPath !== window.location.pathname) {
    window.location.replace(nextPath);
  } else {
    window.location.reload();
  }
  return true;
}
