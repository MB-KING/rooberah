import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireRole } from "@/modules/auth/authorization";
import { requireCurrentUser } from "@/modules/auth/session";
import { MediaService } from "@/modules/media/media.service";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/shared/errors";
import { logger } from "@/lib/logger";
import { refreshAnnouncementCover } from "@/modules/events/announce.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const admin = await requireCurrentUser();
    requireRole(admin, [Role.ADMIN, Role.SUPER_ADMIN]);
    const { eventId } = await params;

    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true }
    });
    if (!event) {
      throw new AppError("EVENT_NOT_FOUND", "Event not found");
    }

    const form = await request.formData();
    const captionRaw = form.get("caption");
    const caption =
      typeof captionRaw === "string" ? captionRaw.trim().slice(0, 200) : "";
    const file = form.get("image");

    if (!(file instanceof Blob) || file.size === 0) {
      throw new AppError("VALIDATION_ERROR", "تصویر معتبر نیست.");
    }

    const filename =
      file instanceof File && file.name ? file.name : "event.jpg";
    const mimeType =
      (file instanceof File && file.type) || file.type || "image/jpeg";
    const buffer = Buffer.from(await file.arrayBuffer());

    const asset = await new MediaService().createFromUpload({
      uploaderId: admin.id,
      buffer,
      filename,
      mimeType
    });

    const count = await prisma.eventImage.count({ where: { eventId } });
    const image = await prisma.eventImage.create({
      data: {
        eventId,
        mediaAssetId: asset.id,
        caption: caption || null,
        sortOrder: count
      }
    });

    await refreshAnnouncementCover(eventId).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      imageId: image.id,
      mediaAssetId: asset.id
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "آپلود ناموفق بود.";
    logger.warn("admin_event_image_upload_failed", { reason: message });
    const status =
      error instanceof AppError
        ? error.status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
