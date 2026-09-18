import {
  Prisma,
  PrismaClient,
  XPTransactionType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LevelService } from "@/modules/gamification/level.service";
import { AppError } from "@/shared/errors";
import { defaultStepRules } from "@/shared/steps";

/** @deprecated Use StepRule / defaultStepRules — kept for tests */
export const xpRules: Record<
  Exclude<XPTransactionType, "SPEND_REWARD" | "ADMIN_ADJUSTMENT">,
  number
> = {
  ATTEND_EVENT: defaultStepRules.ATTEND_EVENT ?? 100,
  REFER_USER: defaultStepRules.REFER_USER ?? 20,
  CREATE_REWARD: defaultStepRules.CREATE_REWARD ?? 30,
  COMPLETE_PROFILE: defaultStepRules.COMPLETE_PROFILE ?? 20,
  ATTEND_SPECIAL_EVENT: defaultStepRules.ATTEND_SPECIAL_EVENT ?? 140,
  EVENT_PHOTO: defaultStepRules.EVENT_PHOTO ?? 10
};

type Tx = Prisma.TransactionClient;

export class XPService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly levelService = new LevelService(db)
  ) {}

  async getRuleAmount(
    communityId: string,
    type: XPTransactionType,
    db: Tx | PrismaClient = this.db
  ) {
    const rule = await db.stepRule.findUnique({
      where: { communityId_type: { communityId, type } }
    });
    if (rule) return rule.amount;
    return defaultStepRules[type] ?? 0;
  }

  async award(
    userId: string,
    type: XPTransactionType,
    referenceType: string,
    referenceId: string,
    description?: string
  ) {
    if (
      type === XPTransactionType.SPEND_REWARD ||
      type === XPTransactionType.ADMIN_ADJUSTMENT
    ) {
      throw new AppError("VALIDATION_ERROR", "Use spend/adjust for this type");
    }

    return this.db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { communityId: true }
      });
      if (!user) {
        throw new AppError("UNAUTHORIZED", "User not found");
      }

      const amount = await this.getRuleAmount(user.communityId, type, tx);
      if (amount <= 0) {
        return null;
      }

      const transaction = await tx.xPTransaction.upsert({
        where: {
          userId_type_referenceType_referenceId: {
            userId,
            type,
            referenceType,
            referenceId
          }
        },
        update: {},
        create: {
          userId,
          type,
          referenceType,
          referenceId,
          amount,
          description
        }
      });

      await this.recalculate(tx, userId);
      return transaction;
    });
  }

  async spend(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ) {
    return this.db.$transaction((tx) =>
      this.spendInTx(tx, userId, amount, referenceType, referenceId, description)
    );
  }

  async spendInTx(
    tx: Tx,
    userId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ) {
    if (amount <= 0) {
      throw new AppError("VALIDATION_ERROR", "Spend amount must be positive");
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.xp < amount) {
      throw new AppError("NOT_ELIGIBLE_FOR_REWARD", "Insufficient steps");
    }

    try {
      await tx.xPTransaction.create({
        data: {
          userId,
          type: XPTransactionType.SPEND_REWARD,
          referenceType,
          referenceId,
          amount: -amount,
          description
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("NOT_ELIGIBLE_FOR_REWARD", "Already spent");
      }
      throw error;
    }

    return this.recalculate(tx, userId);
  }

  async adjust(
    userId: string,
    amount: number,
    referenceId: string,
    description?: string
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.xPTransaction.create({
        data: {
          userId,
          type: XPTransactionType.ADMIN_ADJUSTMENT,
          referenceType: "admin",
          referenceId,
          amount,
          description
        }
      });
      return this.recalculate(tx, userId);
    });
  }

  async revoke(
    userId: string,
    type: XPTransactionType,
    referenceType: string,
    referenceId: string
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.xPTransaction.deleteMany({
        where: { userId, type, referenceType, referenceId }
      });
      return this.recalculate(tx, userId);
    });
  }

  private async recalculate(tx: Tx, userId: string) {
    const totalXP = await tx.xPTransaction.aggregate({
      where: { userId },
      _sum: { amount: true }
    });
    const xp = Math.max(totalXP._sum.amount ?? 0, 0);
    const level = await this.levelService.calculateLevel(userId, xp, tx);
    await tx.user.update({ where: { id: userId }, data: { xp, level } });
    await this.syncXPBadges(tx, userId, xp);
    return { xp, level };
  }

  private async syncXPBadges(db: Tx, userId: string, xp: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { communityId: true }
    });
    if (!user) return;
    const badges = await db.badge.findMany({
      where: { communityId: user.communityId, type: "XP", isActive: true }
    });
    const eligible = badges.filter((badge) => badge.threshold <= xp);
    const ineligibleIds = badges
      .filter((badge) => badge.threshold > xp)
      .map((badge) => badge.id);
    if (ineligibleIds.length)
      await db.userBadge.deleteMany({
        where: { userId, badgeId: { in: ineligibleIds } }
      });
    for (const badge of eligible) {
      await db.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        update: {},
        create: { userId, badgeId: badge.id }
      });
    }
  }
}
