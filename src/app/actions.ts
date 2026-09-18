"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  BusinessStatus,
  RewardStatus,
  RewardType,
  XPTransactionType
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getOptionalCurrentUser,
  requireCurrentUserPage
} from "@/modules/auth/session";
import { RegistrationService } from "@/modules/registrations/registration.service";
import { RewardService } from "@/modules/rewards/reward.service";
import { XPService } from "@/modules/gamification/xp.service";
import { logActivity } from "@/modules/activity/activity.service";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import { buildSocialLinks } from "@/shared/social-links";

const createBusinessSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(3),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional()
});

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

const createRewardSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(3),
  type: z.nativeEnum(RewardType),
  discountValue: z.string().optional(),
  discountCode: z.string().optional(),
  image: z.string().url().optional().or(z.literal("")),
  minimumLevel: optionalPositiveInt,
  minimumAttendance: optionalPositiveInt,
  requiredXP: optionalPositiveInt,
  startAt: z.string().min(10),
  expireAt: z.string().min(10),
  usageLimit: optionalPositiveInt,
  perUserLimit: optionalPositiveInt,
  codes: z.string().optional()
});

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  bio: z.string().max(400).optional(),
  skills: z.string().max(300).optional(),
  businessName: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  workCategoryId: z.string().uuid().optional().or(z.literal("")),
  showInMembersDirectory: z.preprocess((value) => value === "on", z.boolean()),
  showTelegramUsername: z.preprocess((value) => value === "on", z.boolean()),
  showBusiness: z.preprocess((value) => value === "on", z.boolean()),
  showAttendanceCount: z.preprocess((value) => value === "on", z.boolean()),
  showSkills: z.preprocess((value) => value === "on", z.boolean()),
  showSocialLinks: z.preprocess((value) => value === "on", z.boolean()),
  showWorkCategory: z.preprocess((value) => value === "on", z.boolean()),
  workStatus: z
    .enum(["HIRING", "OPEN_TO_WORK", "OPEN_TO_TEAM", "FREELANCE", "NOT_AVAILABLE"])
    .optional()
    .or(z.literal("")),
  showWorkStatus: z.preprocess((value) => value === "on", z.boolean())
});

const feedbackSchema = z.object({
  eventId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

function emptyToUndefined(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export async function registerForEventAction(formData: FormData) {
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  try {
    const user = await getOptionalCurrentUser();
    if (!user) {
      redirect(
        `/events/${eventId}?error=UNAUTHORIZED` as `/events/${string}`
      );
    }
    await new RegistrationService().register(user.id, eventId);
    const { applyReferralCredit } = await import(
      "@/modules/referrals/referral.service"
    );
    await applyReferralCredit(user.id);
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/me");
    redirect(`/events/${eventId}?ok=registered` as `/events/${string}`);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      redirect(
        `/events/${eventId}?error=${error.code}` as `/events/${string}`
      );
    }
    throw error;
  }
}

export async function cancelEventRegistrationAction(formData: FormData) {
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  try {
    const user = await getOptionalCurrentUser();
    if (!user) {
      redirect(
        `/events/${eventId}?error=UNAUTHORIZED` as `/events/${string}`
      );
    }
    await new RegistrationService().cancel(user.id, eventId);
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/me");
    redirect(`/events/${eventId}?ok=cancelled` as `/events/${string}`);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      redirect(
        `/events/${eventId}?error=${error.code}` as `/events/${string}`
      );
    }
    throw error;
  }
}

export async function redeemRewardAction(formData: FormData) {
  const rewardId = z.string().uuid().parse(formData.get("rewardId"));
  try {
    const user = await requireCurrentUserPage();
    await new RewardService().redeem(user.id, rewardId);
    revalidatePath("/");
    revalidatePath("/rewards");
    revalidatePath("/me");
    redirect("/rewards?received=1");
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      redirect(`/rewards?error=${error.code}` as "/rewards");
    }
    redirect("/rewards?error=UNEXPECTED_ERROR" as "/rewards");
  }
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireCurrentUserPage();
  const input = profileSchema.parse(Object.fromEntries(formData));
  const socialLinks = buildSocialLinks({
    website: input.website,
    linkedin: input.linkedin
  });

  const profileData = {
    bio: input.bio?.trim() ? input.bio.trim() : null,
    skills: input.skills?.trim() ? input.skills.trim() : null,
    businessName: input.businessName?.trim()
      ? input.businessName.trim()
      : null,
    socialLinks: socialLinks === null ? Prisma.JsonNull : socialLinks,
    showInMembersDirectory: input.showInMembersDirectory,
    showTelegramUsername: input.showTelegramUsername,
    showBusiness: input.showBusiness,
    showAttendanceCount: input.showAttendanceCount,
    showSkills: input.showSkills,
    showSocialLinks: input.showSocialLinks,
    showWorkCategory: input.showWorkCategory,
    workStatus: input.workStatus ? input.workStatus : null,
    showWorkStatus: input.showWorkStatus
  };

  const [profile] = await Promise.all([
    prisma.userProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        workCategoryId: input.workCategoryId ? input.workCategoryId : null
      }
    })
  ]);

  await new XPService().award(
    user.id,
    XPTransactionType.COMPLETE_PROFILE,
    "UserProfile",
    profile.id,
    "تکمیل تنظیمات پروفایل"
  );
  revalidatePath("/me");
  revalidatePath("/members");
  redirect("/me?profile=saved");
}

export async function submitEventFeedbackAction(formData: FormData) {
  const user = await requireCurrentUserPage();
  const input = feedbackSchema.parse(Object.fromEntries(formData));
  const { FeedbackService } = await import("@/modules/feedback/feedback.service");
  try {
    await new FeedbackService().upsert({
      userId: user.id,
      eventId: input.eventId,
      rating: input.rating,
      comment: input.comment
    });
    revalidatePath(`/events/${input.eventId}`);
    revalidatePath(`/admin/events/${input.eventId}/feedback`);
    revalidatePath("/admin/moderation");
    revalidatePath("/me");
    redirect(`/events/${input.eventId}?ok=feedback` as `/events/${string}`);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      redirect(
        `/events/${input.eventId}?error=${error.code}` as `/events/${string}`
      );
    }
    throw error;
  }
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireCurrentUserPage();
  const notificationId = z
    .string()
    .uuid()
    .parse(formData.get("notificationId"));
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() }
  });
  revalidatePath("/notifications");
  revalidatePath("/me");
  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  const user = await requireCurrentUserPage();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath("/notifications");
  revalidatePath("/me");
  revalidatePath("/");
}

export async function createBusinessAction(formData: FormData) {
  const user = await requireCurrentUserPage();
  const input = createBusinessSchema.parse(Object.fromEntries(formData));

  const business = await prisma.business.create({
    data: {
      communityId: user.communityId,
      name: input.name,
      description: input.description,
      website: emptyToUndefined(input.website),
      instagram: emptyToUndefined(input.instagram),
      status: BusinessStatus.PENDING,
      createdById: user.id,
      members: { create: { userId: user.id, role: "BUSINESS_OWNER" } }
    }
  });

  await logActivity({
    actorUserId: user.id,
    action: "BUSINESS_CREATED",
    entityType: "Business",
    entityId: business.id,
    metadata: { name: business.name }
  });

  revalidatePath("/businesses");
  revalidatePath("/businesses/me");
  revalidatePath("/admin/businesses");
  redirect(`/businesses/${business.id}` as `/businesses/${string}`);
}

export async function createRewardAction(formData: FormData) {
  const user = await requireCurrentUserPage();
  const input = createRewardSchema.parse(Object.fromEntries(formData));

  const business = await prisma.business.findFirst({
    where: {
      id: input.businessId,
      status: BusinessStatus.APPROVED,
      members: { some: { userId: user.id } }
    }
  });

  if (!business) {
    throw new Error(
      "برای ثبت مزیت، کسب‌وکار باید تأیید شده و متعلق به شما باشد."
    );
  }

  const codes = (input.codes ?? "")
    .split(/\r?\n/)
    .map((code) => code.trim())
    .filter(Boolean);

  const reward = await prisma.reward.create({
    data: {
      communityId: user.communityId,
      businessId: business.id,
      title: input.title,
      description: input.description,
      type: input.type,
      discountValue: emptyToUndefined(input.discountValue),
      discountCode: emptyToUndefined(input.discountCode),
      image: emptyToUndefined(input.image),
      minimumLevel: input.minimumLevel,
      minimumAttendance: input.minimumAttendance,
      requiredXP: input.requiredXP,
      startAt: new Date(input.startAt),
      expireAt: new Date(input.expireAt),
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit ?? 1,
      status: RewardStatus.PENDING,
      createdById: user.id,
      codes:
        codes.length > 0
          ? { create: codes.map((code) => ({ code })) }
          : undefined
    }
  });

  await Promise.all([
    new XPService().award(
      user.id,
      XPTransactionType.CREATE_REWARD,
      "Reward",
      reward.id,
      "ثبت مزیت برای اعضا"
    ),
    logActivity({
      actorUserId: user.id,
      action: "REWARD_CREATED",
      entityType: "Reward",
      entityId: reward.id,
      metadata: { businessId: business.id, title: reward.title }
    })
  ]);

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${business.id}`);
  revalidatePath("/businesses/me");
  revalidatePath("/admin/rewards");
  redirect(
    `/businesses/${business.id}?reward=${reward.id}` as `/businesses/${string}`
  );
}
