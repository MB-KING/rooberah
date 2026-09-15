import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const name = "رو‌به‌راه";
const tagline = "همراه هم برای رشد";

const result = await prisma.community.updateMany({
  where: { slug: "ham-masir" },
  data: { name, tagline }
});

console.log(`updated ${result.count} community row(s) to ${name}`);
await prisma.$disconnect();
