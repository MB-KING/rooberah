import { BadgeType, PrismaClient, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RETIRED_ROLE_BADGE_SLUGS, ROLE_BADGE } from "@/shared/role-badges";

export class BadgeService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async syncCommunityRoleBadges(communityId: string) {
    const [lead, users] = await Promise.all([
      this.ensureRoleBadge(communityId, ROLE_BADGE),
      this.db.user.findMany({
        where: { communityId, deletedAt: null },
        select: { id: true, roles: { select: { role: true } } }
      }),
      this.retireHostBadge(communityId)
    ]);

    for (const user of users) {
      const roles = user.roles.map((item) => item.role);
      const isLead =
        roles.includes(Role.SUPER_ADMIN) || roles.includes(Role.ADMIN);
      await this.setRoleBadge(user.id, lead.id, isLead);
    }
  }

  async syncUserRoleBadges(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        communityId: true,
        roles: { select: { role: true } }
      }
    });
    if (!user) return;
    const [lead] = await Promise.all([
      this.ensureRoleBadge(user.communityId, ROLE_BADGE),
      this.retireHostBadge(user.communityId)
    ]);
    const roles = user.roles.map((item) => item.role);
    const isLead =
      roles.includes(Role.SUPER_ADMIN) || roles.includes(Role.ADMIN);
    await this.setRoleBadge(userId, lead.id, isLead);
  }

  private async retireHostBadge(communityId: string) {
    const retired = await this.db.badge.findMany({
      where: {
        communityId,
        slug: { in: [...RETIRED_ROLE_BADGE_SLUGS] }
      },
      select: { id: true }
    });
    if (retired.length === 0) return;
    const ids = retired.map((item) => item.id);
    await this.db.userBadge.deleteMany({ where: { badgeId: { in: ids } } });
    await this.db.badge.deleteMany({ where: { id: { in: ids } } });
  }

  private async ensureRoleBadge(
    communityId: string,
    badge: { slug: string; name: string; description: string }
  ) {
    return this.db.badge.upsert({
      where: { communityId_slug: { communityId, slug: badge.slug } },
      update: {
        name: badge.name,
        description: badge.description,
        type: BadgeType.SPECIAL,
        isActive: true
      },
      create: {
        communityId,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        type: BadgeType.SPECIAL,
        threshold: 0,
        isActive: true,
        sortOrder: 0
      }
    });
  }

  private async setRoleBadge(userId: string, badgeId: string, enabled: boolean) {
    if (enabled) {
      await this.db.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } },
        update: {},
        create: { userId, badgeId }
      });
      return;
    }
    await this.db.userBadge.deleteMany({ where: { userId, badgeId } });
  }


  async evaluateAttendanceBadges(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { communityId: true }
    });
    if (!user) {
      return [];
    }

    const attendanceCount = await this.db.attendance.count({
      where: { userId, status: "PRESENT" }
    });
    const badges = await this.db.badge.findMany({
      where: {
        communityId: user.communityId,
        type: BadgeType.ATTENDANCE_COUNT,
        isActive: true
      }
    });

    const eligible = badges.filter(
      (badge) => badge.threshold <= attendanceCount
    );
    const ineligibleIds = badges
      .filter((badge) => badge.threshold > attendanceCount)
      .map((badge) => badge.id);
    if (ineligibleIds.length > 0) {
      await this.db.userBadge.deleteMany({
        where: { userId, badgeId: { in: ineligibleIds } }
      });
    }

    return Promise.all(
      eligible.map((badge) =>
        this.db.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: badge.id } },
          update: {},
          create: { userId, badgeId: badge.id }
        })
      )
    );
  }
}
