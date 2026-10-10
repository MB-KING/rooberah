import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/modules/auth/session";
import { ok, fail } from "@/shared/api";
import { shownProfilePhoto } from "@/shared/profile-photo";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const [
      attendanceCount,
      registrationCount,
      badges,
      profile,
      xpHistory,
      redemptions,
      notifications
    ] = await Promise.all([
      prisma.attendance.count({
        where: { userId: user.id, status: "PRESENT" }
      }),
      prisma.eventRegistration.count({
        where: { userId: user.id, status: "REGISTERED" }
      }),
      prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true },
        orderBy: { earnedAt: "desc" }
      }),
      prisma.userProfile.findUnique({ where: { userId: user.id } }),
      prisma.xPTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.rewardRedemption.findMany({
        where: { userId: user.id },
        include: { reward: true, rewardCode: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);

    return ok({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: shownProfilePhoto(user),
      joinedAt: user.joinedAt,
      xp: user.xp,
      level: user.level,
      attendanceCount,
      registrationCount,
      profile,
      badges: badges.map((item) => ({
        id: item.badge.id,
        name: item.badge.name,
        icon: item.badge.icon,
        earnedAt: item.earnedAt
      })),
      xpHistory,
      redemptions: redemptions.map((item) => ({
        id: item.id,
        title: item.reward.title,
        status: item.status,
        code: item.rewardCode?.code ?? item.reward.discountCode,
        createdAt: item.createdAt
      })),
      notifications
    });
  } catch (error) {
    return fail(error);
  }
}
