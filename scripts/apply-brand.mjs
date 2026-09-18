import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const name = "رو به راه";
const tagline = "همراه هم برای رشد";
const slug = "rooberah";

const result = await prisma.community.updateMany({
  where: { slug: { in: ["ham-masir", "rooberah"] } },
  data: { name, tagline, slug }
});

console.log(`updated ${result.count} community row(s) to ${name} (${slug})`);
await prisma.$disconnect();
