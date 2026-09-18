import type { Prisma, WorkStatus } from "@prisma/client";
import { WORK_STATUS_OPTIONS } from "@/shared/work-status";

function contains(q: string): Prisma.StringFilter {
  return { contains: q, mode: "insensitive" };
}

function textFields(q: string): Prisma.UserWhereInput[] {
  return [
    { firstName: contains(q) },
    { lastName: contains(q) },
    { username: contains(q) },
    { profile: { is: { bio: contains(q) } } },
    { profile: { is: { skills: contains(q) } } },
    { profile: { is: { businessName: contains(q) } } },
    { workCategory: { is: { name: contains(q) } } },
    {
      businessMemberships: {
        some: {
          business: {
            deletedAt: null,
            name: contains(q)
          }
        }
      }
    },
    {
      badges: {
        some: { badge: { name: contains(q) } }
      }
    }
  ];
}

function matchingWorkStatuses(q: string): WorkStatus[] {
  const needle = q.trim();
  if (!needle) return [];
  return WORK_STATUS_OPTIONS.filter(
    (item) => item.label.includes(needle) || needle.includes(item.label)
  ).map((item) => item.value as WorkStatus);
}

export function memberSearchOr(q: string): Prisma.UserWhereInput[] {
  const query = q.trim();
  if (!query) return [];

  const statuses = matchingWorkStatuses(query);
  const clauses = [
    ...textFields(query),
    ...(statuses.length
      ? [{ profile: { is: { workStatus: { in: statuses } } } }]
      : [])
  ];

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    clauses.push({
      AND: tokens.map((token) => ({ OR: textFields(token) }))
    });
  }

  return clauses;
}
