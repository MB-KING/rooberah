import { PrismaClient, Role, BadgeType, EventStatus, RewardStatus, RewardType, BusinessStatus, XPTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const workCategories = [
  ["programming", "برنامه‌نویسی و فناوری"],
  ["design", "طراحی"],
  ["marketing", "مارکتینگ"],
  ["management", "مدیریت"],
  ["sales", "فروش"],
  ["finance", "مالی"],
  ["medical", "پزشکی"],
  ["law", "حقوق"],
  ["art", "هنر"],
  ["education", "آموزش"],
  ["business", "کسب‌وکار و کارآفرینی"],
  ["other", "سایر"]
];

const stepRules = [
  [XPTransactionType.ATTEND_EVENT, 100],
  [XPTransactionType.ATTEND_SPECIAL_EVENT, 140],
  [XPTransactionType.COMPLETE_PROFILE, 20],
  [XPTransactionType.REFER_USER, 20],
  [XPTransactionType.CREATE_REWARD, 30],
  [XPTransactionType.EVENT_PHOTO, 10]
];

async function main() {
  await prisma.community.updateMany({
    where: { slug: "ham-masir" },
    data: {
      slug: "rooberah",
      name: "رو به راه",
      tagline: "همراه هم برای رشد"
    }
  });
  const community = await prisma.community.upsert({
    where: { slug: "rooberah" },
    update: {
      name: "رو به راه",
      tagline: "همراه هم برای رشد"
    },
    create: {
      name: "رو به راه",
      slug: "rooberah",
      tagline: "همراه هم برای رشد"
    }
  });

  for (const [index, [slug, name]] of workCategories.entries()) {
    await prisma.workCategory.upsert({
      where: { communityId_slug: { communityId: community.id, slug } },
      update: { name, sortOrder: index, isActive: true },
      create: {
        communityId: community.id,
        slug,
        name,
        sortOrder: index,
        isActive: true
      }
    });
  }

  for (const [type, amount] of stepRules) {
    await prisma.stepRule.upsert({
      where: { communityId_type: { communityId: community.id, type } },
      update: { amount },
      create: { communityId: community.id, type, amount }
    });
  }

  const allowDemoUsers = process.env.NODE_ENV !== "production";
  const superAdmin = allowDemoUsers
    ? await prisma.user.upsert({
        where: { telegramId: 1000000001n },
        update: {},
        create: {
          communityId: community.id,
          telegramId: 1000000001n,
          username: "rooberah_admin",
          firstName: "Admin",
          lastName: "Rooberah",
          roles: { create: [{ role: Role.SUPER_ADMIN }, { role: Role.ADMIN }] },
          profile: { create: {} }
        }
      })
    : await prisma.user.findFirst({
        where: {
          deletedAt: null,
          roles: { some: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } } }
        },
        orderBy: { joinedAt: "asc" }
      });

  if (!superAdmin) {
    throw new Error("No admin user found; seed demo users only run outside production.");
  }

  const sampleUser = allowDemoUsers
    ? await prisma.user.upsert({
        where: { telegramId: 1000000002n },
        update: {},
        create: {
          communityId: community.id,
          telegramId: 1000000002n,
          username: "walker_one",
          firstName: "Sample",
          lastName: "Walker",
          profile: { create: {} },
          roles: { create: [{ role: Role.USER }] }
        }
      })
    : null;

  const badges = [
    ["first-step", "قدم اول", 1],
    ["same-step", "هم قدم", 5],
    ["stable-base", "پایه ثابت", 10],
    ["pro", "رو‌به‌راه حرفه ای", 20],
    ["legend", "افسانه رو‌به‌راه", 50]
  ];

  for (const [slug, name, threshold] of badges) {
    await prisma.badge.upsert({
      where: { communityId_slug: { communityId: community.id, slug } },
      update: {},
      create: {
        communityId: community.id,
        slug,
        name,
        type: BadgeType.ATTENDANCE_COUNT,
        threshold,
        icon: "Footprints",
        sortOrder: threshold
      }
    });
  }

  await prisma.badge.upsert({
    where: { communityId_slug: { communityId: community.id, slug: "rahbar" } },
    update: { name: "راهبر", type: BadgeType.SPECIAL, isActive: true },
    create: {
      communityId: community.id,
      slug: "rahbar",
      name: "راهبر",
      description: "راهبر جامعه رو‌به‌راه",
      type: BadgeType.SPECIAL,
      threshold: 0,
      sortOrder: 0
    }
  });

  for (const [level, requiredXP] of [
    [1, 0],
    [2, 250],
    [3, 600],
    [4, 1200],
    [5, 2200]
  ]) {
    await prisma.level.upsert({
      where: { communityId_level: { communityId: community.id, level } },
      update: {},
      create: { communityId: community.id, level, requiredXP, name: `Level ${level}` }
    });
  }

  if (!allowDemoUsers || !sampleUser) {
    console.log({ community: community.slug, skippedDemo: true });
    return;
  }

  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  nextSunday.setHours(19, 45, 0, 0);

  const event = await prisma.event.upsert({
    where: { communityId_eventNumber: { communityId: community.id, eventNumber: 119 } },
    update: {},
    create: {
      communityId: community.id,
      eventNumber: 119,
      title: "۱۱۹امین برنامه پیاده روی گروهی",
      description: "مسیر عصرگاهی برای دیدار، گفتگو و حرکت جمعی.",
      date: nextSunday,
      meetingTime: nextSunday,
      startTime: new Date(nextSunday.getTime() + 15 * 60 * 1000),
      locationName: "بوستان آب و آتش",
      locationAddress: "میدان فانوس دریایی",
      capacity: 80,
      status: EventStatus.PUBLISHED,
      createdById: superAdmin.id
    }
  });

  let business = await prisma.business.findFirst({
    where: { communityId: community.id, name: "کافه هم قدم" }
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        communityId: community.id,
        name: "کافه هم قدم",
        description: "پذیرایی دوستانه برای اعضای فعال رو‌به‌راه.",
        status: BusinessStatus.APPROVED,
        createdById: sampleUser.id,
        approvedById: superAdmin.id,
        approvedAt: new Date(),
        members: { create: { userId: sampleUser.id, role: Role.BUSINESS_OWNER } }
      }
    });
  } else {
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: BusinessStatus.APPROVED,
        approvedById: superAdmin.id,
        approvedAt: new Date()
      }
    });

    await prisma.businessMember.upsert({
      where: { businessId_userId_role: { businessId: business.id, userId: sampleUser.id, role: Role.BUSINESS_OWNER } },
      update: {},
      create: { businessId: business.id, userId: sampleUser.id, role: Role.BUSINESS_OWNER }
    });
  }

  const existingReward = await prisma.reward.findFirst({
    where: { businessId: business.id, title: "نوشیدنی رایگان بعد از پیاده روی" }
  });

  if (!existingReward) {
    await prisma.reward.create({
      data: {
        communityId: community.id,
        businessId: business.id,
        title: "نوشیدنی رایگان بعد از پیاده روی",
        description: "برای اعضایی که حداقل یک حضور تایید شده دارند.",
        type: RewardType.FREE_ITEM,
        minimumAttendance: 1,
        startAt: new Date(),
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: RewardStatus.APPROVED,
        createdById: sampleUser.id,
        approvedById: superAdmin.id,
        approvedAt: new Date()
      }
    });
  }

  console.log({ community: community.slug, event: event.eventNumber });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
