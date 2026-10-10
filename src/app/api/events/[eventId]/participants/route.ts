import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { getPublicMemberView } from "@/shared/privacy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const take = Math.min(Number(searchParams.get("take") ?? 20), 50);

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    select: { id: true }
  });
  if (!event) {
    return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const rows = await prisma.eventRegistration.findMany({
    where: { eventId, status: "REGISTERED" },
    orderBy: [{ registeredAt: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1
        }
      : {}),
    select: {
      id: true,
      registeredAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          photoUrl: true,
          telegramPhotoUrl: true,
          profile: {
            select: {
              showInMembersDirectory: true,
              showTelegramUsername: true,
              bio: true
            }
          }
        }
      }
    }
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const items = page
    .filter((row) => row.user.profile?.showInMembersDirectory !== false)
    .map((row) => ({
      registrationId: row.id,
      registeredAt: row.registeredAt,
      ...getPublicMemberView(row.user)
    }));

  return NextResponse.json({
    items,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null
  });
}
