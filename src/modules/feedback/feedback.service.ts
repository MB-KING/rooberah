import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity, notifyUser } from "@/modules/activity/activity.service";
import { feedbackReviewedCopy } from "@/shared/notify-copy";
import { assertEventContributionAllowed } from "@/modules/events/event-contribution";
import { AppError } from "@/shared/errors";

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  photoUrl: true
} as const;

export class FeedbackService {
  async upsert(input: {
    userId: string;
    eventId: string;
    rating: number;
    comment?: string | null;
  }) {
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError("VALIDATION_ERROR", "Rating must be 1-5");
    }

    await assertEventContributionAllowed(input.userId, input.eventId);

    return prisma.eventFeedback.upsert({
      where: {
        eventId_userId: { eventId: input.eventId, userId: input.userId }
      },
      create: {
        eventId: input.eventId,
        userId: input.userId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
        status: ModerationStatus.PENDING,
        reviewedById: null,
        reviewedAt: null
      },
      update: {
        rating: input.rating,
        comment: input.comment?.trim() || null,
        status: ModerationStatus.PENDING,
        reviewedById: null,
        reviewedAt: null
      }
    });
  }

  async listForEvent(eventId: string, status?: ModerationStatus) {
    return prisma.eventFeedback.findMany({
      where: { eventId, ...(status ? { status } : {}) },
      include: { user: { select: authorSelect } },
      orderBy: { createdAt: "desc" }
    });
  }

  async listApproved(eventId: string) {
    return this.listForEvent(eventId, ModerationStatus.APPROVED);
  }

  async statsForEvent(eventId: string, approvedOnly = false) {
    const where = {
      eventId,
      ...(approvedOnly ? { status: ModerationStatus.APPROVED } : {})
    };
    const agg = await prisma.eventFeedback.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true }
    });
    return {
      average: agg._avg.rating ?? 0,
      count: agg._count._all
    };
  }

  async review(input: {
    feedbackId: string;
    reviewerId: string;
    status: ModerationStatus;
  }) {
    if (input.status === ModerationStatus.PENDING) {
      throw new AppError("VALIDATION_ERROR", "Invalid review status");
    }

    const feedback = await prisma.eventFeedback.findUnique({
      where: { id: input.feedbackId },
      include: {
        event: { select: { id: true, title: true, eventNumber: true } }
      }
    });
    if (!feedback) throw new AppError("NOT_FOUND", "Feedback not found");

    const updated = await prisma.eventFeedback.update({
      where: { id: input.feedbackId },
      data: {
        status: input.status,
        reviewedById: input.reviewerId,
        reviewedAt: new Date()
      }
    });

    await notifyUser({
      userId: feedback.userId,
      type: "EVENT_FEEDBACK_REVIEWED",
      ...feedbackReviewedCopy(
        feedback.event.title,
        input.status === ModerationStatus.APPROVED
      ),
      eventPath: `/events/${feedback.eventId}`
    });
    await logActivity({
      actorUserId: input.reviewerId,
      action: "EVENT_FEEDBACK_REVIEWED",
      entityType: "EventFeedback",
      entityId: feedback.id,
      metadata: { status: input.status, eventId: feedback.eventId }
    });

    return updated;
  }

  async pendingCount() {
    return prisma.eventFeedback.count({
      where: { status: ModerationStatus.PENDING }
    });
  }
}
