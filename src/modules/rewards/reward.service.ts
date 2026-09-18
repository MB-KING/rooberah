import {
  BusinessStatus,
  Prisma,
  RewardRedemptionStatus,
  RewardStatus
} from "@prisma/client";
import { lockNextRewardCode, lockRewardRow } from "@/lib/db-lock";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/activity/activity.service";
import { XPService } from "@/modules/gamification/xp.service";
import { rewardRedeemedCopy } from "@/shared/notify-copy";
import { AppError } from "@/shared/errors";

const activeRedemptionStatuses: RewardRedemptionStatus[] = [
  RewardRedemptionStatus.REDEEMED,
  RewardRedemptionStatus.RESERVED
];

export class RewardService {
  constructor(private readonly xpService = new XPService()) {}

  async listApproved(take: number, skip: number) {
    const now = new Date();
    return prisma.reward.findMany({
      where: {
        status: RewardStatus.APPROVED,
        startAt: { lte: now },
        expireAt: { gt: now },
        business: { status: BusinessStatus.APPROVED, deletedAt: null }
      },
      include: { business: true },
      orderBy: { expireAt: "asc" },
      take,
      skip
    });
  }

  async redeem(userId: string, rewardId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await lockRewardRow(tx, rewardId);
      if (locked.length === 0) {
        throw new AppError(
          "NOT_ELIGIBLE_FOR_REWARD",
          "Reward is not available"
        );
      }

      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
        include: { business: true }
      });

      const now = new Date();
      if (
        !reward ||
        reward.status !== RewardStatus.APPROVED ||
        reward.startAt > now ||
        reward.expireAt < now ||
        reward.business.status !== BusinessStatus.APPROVED ||
        reward.business.deletedAt
      ) {
        throw new AppError(
          "NOT_ELIGIBLE_FOR_REWARD",
          "Reward is not available"
        );
      }

      const [attendanceCount, user, activeCount, userActiveCount] =
        await Promise.all([
          tx.attendance.count({ where: { userId, status: "PRESENT" } }),
          tx.user.findUnique({ where: { id: userId } }),
          tx.rewardRedemption.count({
            where: {
              rewardId,
              status: { in: activeRedemptionStatuses }
            }
          }),
          tx.rewardRedemption.count({
            where: {
              rewardId,
              userId,
              status: { in: activeRedemptionStatuses }
            }
          })
        ]);

      const stepCost = reward.requiredXP ?? 0;

      if (
        !user ||
        (reward.minimumLevel && user.level < reward.minimumLevel) ||
        (reward.minimumAttendance &&
          attendanceCount < reward.minimumAttendance) ||
        (stepCost > 0 && user.xp < stepCost)
      ) {
        throw new AppError("NOT_ELIGIBLE_FOR_REWARD", "User is not eligible");
      }

      if (reward.usageLimit && activeCount >= reward.usageLimit) {
        throw new AppError("REWARD_OUT_OF_STOCK", "Reward usage limit reached");
      }

      if (reward.perUserLimit && userActiveCount >= reward.perUserLimit) {
        throw new AppError(
          "NOT_ELIGIBLE_FOR_REWARD",
          "Per user limit reached"
        );
      }

      const codes = await lockNextRewardCode(tx, rewardId);
      const code = codes[0] ?? null;
      const hasCodes =
        (await tx.rewardCode.count({ where: { rewardId } })) > 0;

      if (reward.discountCode === null && hasCodes && !code) {
        throw new AppError("REWARD_OUT_OF_STOCK", "No reward codes left");
      }

      if (code) {
        const claimed = await tx.rewardCode.updateMany({
          where: { id: code.id, isRedeemed: false },
          data: { isRedeemed: true }
        });
        if (claimed.count === 0) {
          throw new AppError("REWARD_OUT_OF_STOCK", "No reward codes left");
        }
      }

      try {
        const redemption = await tx.rewardRedemption.create({
          data: {
            rewardId,
            userId,
            rewardCodeId: code?.id,
            status: RewardRedemptionStatus.REDEEMED,
            redeemedAt: now
          }
        });

        if (stepCost > 0) {
          await this.xpService.spendInTx(
            tx,
            userId,
            stepCost,
            "RewardRedemption",
            redemption.id,
            `خرج امتیاز برای ${reward.title}`
          );
        }

        return {
          redemption,
          rewardTitle: reward.title,
          code: code?.code ?? reward.discountCode
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError("REWARD_OUT_OF_STOCK", "No reward codes left");
        }
        throw error;
      }
    });

    await notifyUser({
      userId,
      type: "REWARD_REDEEMED",
      ...rewardRedeemedCopy(result.rewardTitle, result.code),
      eventPath: "/me"
    });

    return result.redemption;
  }
}
