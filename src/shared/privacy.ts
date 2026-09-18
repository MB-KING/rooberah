import { APP_NAME } from "@/shared/brand";

type PrivacyUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  xp?: number;
  profile?: {
    bio?: string | null;
    skills?: string | null;
    businessName?: string | null;
    socialLinks?: unknown;
    showInMembersDirectory?: boolean;
    showTelegramUsername?: boolean;
    showBusiness?: boolean;
    showAttendanceCount?: boolean;
    showSkills?: boolean;
    showSocialLinks?: boolean;
    showWorkCategory?: boolean;
    workStatus?: string | null;
    showWorkStatus?: boolean;
  } | null;
  workCategory?: { id: string; name: string } | null;
};

export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username || `عضو ${APP_NAME}`;
}

export function getPublicMemberView(
  user: PrivacyUser,
  options?: { includeXp?: boolean; attendanceCount?: number | null }
) {
  const profile = user.profile;
  const showUsername = profile?.showTelegramUsername !== false;
  const showSkills = profile?.showSkills !== false;
  const showSocial = profile?.showSocialLinks !== false;
  const showWork = profile?.showWorkCategory !== false;
  const showAttendance = profile?.showAttendanceCount !== false;
  const showBusiness = profile?.showBusiness !== false;
  const showWorkStatus = profile?.showWorkStatus !== false;

  return {
    id: user.id,
    displayName: getDisplayName(user),
    photoUrl: user.photoUrl,
    username: showUsername ? user.username : null,
    bio: profile?.bio ?? null,
    skills: showSkills ? (profile?.skills ?? null) : null,
    businessName:
      showBusiness && profile?.businessName?.trim()
        ? profile.businessName.trim()
        : null,
    socialLinks: showSocial ? (profile?.socialLinks ?? null) : null,
    workCategory:
      showWork && user.workCategory
        ? { id: user.workCategory.id, name: user.workCategory.name }
        : null,
    workStatus:
      showWorkStatus && profile?.workStatus ? profile.workStatus : null,
    xp: options?.includeXp ? (user.xp ?? 0) : null,
    attendanceCount:
      showAttendance && options?.attendanceCount != null
        ? options.attendanceCount
        : null,
    listed: profile?.showInMembersDirectory !== false
  };
}
