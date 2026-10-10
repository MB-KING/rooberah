/** Own upload wins. Otherwise show the Telegram profile photo. */
export function shownProfilePhoto(
  user?: {
    photoUrl?: string | null;
    telegramPhotoUrl?: string | null;
  } | null
) {
  if (user?.photoUrl?.startsWith("/")) return user.photoUrl;
  const telegram = user?.telegramPhotoUrl;
  if (
    telegram &&
    (telegram.startsWith("/") ||
      telegram.startsWith("https://") ||
      telegram.startsWith("http://"))
  ) {
    return telegram;
  }
  if (
    user?.photoUrl?.startsWith("https://") ||
    user?.photoUrl?.startsWith("http://")
  ) {
    return user.photoUrl;
  }
  return null;
}
