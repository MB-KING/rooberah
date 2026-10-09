import { AttendanceStatus, EventReminderKind, EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/activity/activity.service";
import { feedbackInviteCopy } from "@/shared/notify-copy";

export async function invitePresentMembersToFeedback(eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null, status: EventStatus.COMPLETED },
    select: { id: true, title: true }
  });
  if (!event) return 0;

  const present = await prisma.attendance.findMany({
    where: { eventId, status: AttendanceStatus.PRESENT },
    select: { userId: true }
  });

  let sent = 0;
  for (const row of present) {
    sent += await sendFeedbackInvite({
      eventId: event.id,
      userId: row.userId,
      title: event.title
    });
  }
  return sent;
}

export async function inviteUserToFeedback(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null, status: EventStatus.COMPLETED },
    select: { id: true, title: true }
  });
  if (!event) return 0;
  return sendFeedbackInvite({
    eventId: event.id,
    userId,
    title: event.title
  });
}

async function sendFeedbackInvite(input: {
  eventId: string;
  userId: string;
  title: string;
}) {
  try {
    await prisma.eventReminder.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        kind: EventReminderKind.FEEDBACK_REQUEST
      }
    });
  } catch {
    return 0;
  }

  await notifyUser({
    userId: input.userId,
    type: "EVENT_FEEDBACK_REQUEST",
    ...feedbackInviteCopy(input.title),
    eventPath: `/events/${input.eventId}`
  });
  return 1;
}
