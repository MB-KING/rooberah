import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  savePreparedInlinePhoto,
  sendTelegramPhotoBuffer
} from "@/lib/telegram-bot";
import {
  parseShareCardFormat,
  parseShareCardUserId,
  renderShareCard,
  renderShareCardJpeg,
  renderShareCardPng,
  shareCardSizes
} from "@/lib/share-card";
import { requireCurrentUser } from "@/modules/auth/session";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { APP_NAME } from "@/shared/brand";
import { AppError, errorMessagesFa } from "@/shared/errors";
import {
  eventReferralUrl,
  eventShareCardUrl,
  eventShareTelegramCaption,
  type ShareCardFormat
} from "@/shared/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  format: z.enum(["story", "square", "landscape"]).optional(),
  action: z.enum(["dm", "prepare"])
});

function telegramCaption(title: string) {
  return eventShareTelegramCaption(title).slice(0, 1024);
}

function telegramDmErrorFa(reason: string) {
  const text = reason.toLowerCase();
  if (
    text.includes("blocked") ||
    text.includes("forbidden") ||
    text.includes("chat not found") ||
    text.includes("bot can't initiate") ||
    text.includes("can't initiate") ||
    text.includes("user is deactivated")
  ) {
    return `اول ربات ${APP_NAME} را در تلگرام استارت کن، بعد دوباره امتحان کن.`;
  }
  return "ارسال عکس به چت تلگرام انجام نشد. دوباره امتحان کن.";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function loadPublicEvent(eventId: string) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    select: {
      title: true
    }
  });
  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", errorMessagesFa.EVENT_NOT_FOUND, 404);
  }
  return event;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const search = new URL(request.url).searchParams;
    const format = parseShareCardFormat(search.get("format"));
    const userId = parseShareCardUserId(
      search.get("userId") ?? search.get("u")
    );
    const mime = search.get("mime")?.toLowerCase();

    if (mime === "jpeg" || mime === "jpg") {
      const jpeg = await renderShareCardJpeg({ eventId, format, userId });
      return new Response(new Uint8Array(jpeg.buffer), {
        headers: {
          "Content-Type": jpeg.contentType,
          "Cache-Control": "public, max-age=120, s-maxage=300"
        }
      });
    }

    const image = await renderShareCard({ eventId, format, userId });
    try {
      image.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
    } catch {
      // ImageResponse headers may be immutable in some runtimes.
    }
    return image;
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(error.message, { status: error.status });
    }
    logger.warn("share_card_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return new Response(
      error instanceof Error ? error.message : "Share card failed",
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { eventId } = await params;
    const body = postBodySchema.parse(
      await request.json().catch(() => ({}))
    );
    const format: ShareCardFormat = parseShareCardFormat(body.format);
    const event = await loadPublicEvent(eventId);
    const shareUrl = eventReferralUrl(eventId, user.id);
    const caption = telegramCaption(event.title);
    const eventPath = `/events/${eventId}`;

    if (body.action === "prepare") {
      const size = shareCardSizes[format];
      const prepared = await savePreparedInlinePhoto({
        telegramUserId: user.telegramId,
        photoUrl: eventShareCardUrl(eventId, {
          format,
          userId: user.id,
          mime: "jpeg"
        }),
        photoWidth: size.width,
        photoHeight: size.height,
        caption,
        buttonUrl: shareUrl,
        buttonText: "🥾 باز کردن برنامه"
      });
      return NextResponse.json({
        ok: true,
        preparedId: prepared.id
      });
    }

    const png = await renderShareCardPng({
      eventId,
      format,
      userId: user.id
    });
    const sent = await sendTelegramPhotoBuffer({
      chatId: user.telegramId,
      photo: png.buffer,
      filename: `rooberah-${format}.png`,
      contentType: "image/png",
      caption,
      openApp: true,
      eventPath,
      buttonText: "🥾 باز کردن برنامه"
    });

    if (!sent.ok) {
      return jsonError(telegramDmErrorFa(sent.reason), 502);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(errorMessagesFa.VALIDATION_ERROR, 422);
    }
    if (error instanceof AppError) {
      return jsonError(
        errorMessagesFa[error.code] || error.message,
        error.status
      );
    }
    logger.warn("share_card_post_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    const reason = error instanceof Error ? error.message : "";
    if (reason) {
      return jsonError(telegramDmErrorFa(reason), 502);
    }
    return jsonError(errorMessagesFa.UNEXPECTED_ERROR, 500);
  }
}
