import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { persianForOg } from "@/lib/persian-og-text";
import {
  faTehranDateFormatter,
  faTehranTimeFormatter
} from "@/lib/tehran-time";
import { APP_NAME, brandColors } from "@/shared/brand";
import { MEETING_TIME_LABEL, START_TIME_LABEL } from "@/shared/copy";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { MediaService } from "@/modules/media/media.service";
import { getDisplayName } from "@/shared/privacy";
import {
  shareCardFormats,
  type ShareCardFormat
} from "@/shared/share";
import { AppError } from "@/shared/errors";

export const shareCardSizes = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 630 }
} as const;

const timeFormatter = faTehranTimeFormatter;

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function parseShareCardFormat(
  value: string | null | undefined
): ShareCardFormat {
  if (value && (shareCardFormats as readonly string[]).includes(value)) {
    return value as ShareCardFormat;
  }
  return "square";
}

export function parseShareCardUserId(value: string | null | undefined) {
  const id = value?.trim() ?? "";
  return UUID_RE.test(id) ? id : null;
}

/** Satori needs pre-shaped visual RTL; never inject bidi control chars. */
export function rtlText(value: string) {
  return persianForOg(value);
}

function shorten(text: string, max: number) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function wrapWords(text: string, maxChars: number, maxLines = 2) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    const remaining = [word, ...words.slice(i + 1)].join(" ");
    if (lines.length >= maxLines - 1) {
      lines.push(shorten(remaining, maxChars));
      return lines;
    }
    current = word.length > maxChars ? shorten(word, maxChars) : word;
  }
  if (current) lines.push(current);
  return lines;
}

async function loadVazirmatnFont() {
  const localCandidates = [
    join(process.cwd(), "public/fonts/Vazirmatn-Bold.ttf"),
    join(process.cwd(), "fonts/Vazirmatn-Bold.ttf")
  ];

  for (const file of localCandidates) {
    try {
      const data = await readFile(file);
      if (data.byteLength > 10_000) return data;
    } catch {
      // try next
    }
  }

  const sources = [
    "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Bold.ttf",
    "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Bold.woff"
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) continue;
      const data = await response.arrayBuffer();
      if (data.byteLength > 10_000 && data.byteLength < 2_000_000) return data;
    } catch {
      // try next source
    }
  }
  return null;
}

async function toJpegDataUrl(
  buffer: Buffer,
  contentType: string,
  size: { width: number; height: number }
) {
  try {
    const sharp = (await import("sharp")).default;
    const resized = await sharp(buffer)
      .rotate()
      .resize({
        width: size.width,
        height: size.height,
        fit: "cover",
        withoutEnlargement: true
      })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch (error) {
    logger.warn("share_card_image_resize_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    const ok =
      contentType.includes("jpeg") ||
      contentType.includes("jpg") ||
      contentType.includes("png");
    if (!ok || buffer.byteLength > 220_000) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }
}

async function toAvatarDataUrl(photoUrl: string) {
  if (!/^https:\/\//i.test(photoUrl)) return null;
  try {
    const response = await fetch(photoUrl, {
      cache: "force-cache",
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 32 || buffer.byteLength > 2_000_000) return null;
    return toJpegDataUrl(buffer, contentType, { width: 192, height: 192 });
  } catch (error) {
    logger.warn("share_card_avatar_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

type Sharer = {
  displayName: string;
  avatarDataUrl: string | null;
  initial: string;
};

async function loadSharer(userId: string | null): Promise<Sharer | null> {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      photoUrl: true
    }
  });
  if (!user) return null;
  const displayName = getDisplayName(user);
  const initial = displayName.trim().charAt(0) || "ه";
  const avatarDataUrl = user.photoUrl
    ? await toAvatarDataUrl(user.photoUrl)
    : null;
  return { displayName, avatarDataUrl, initial };
}

function RtlLine({
  text,
  fontSize,
  color,
  fontWeight = 700
}: {
  text: string;
  fontSize: number;
  color: string;
  fontWeight?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: "flex-end"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "nowrap",
          fontSize,
          color,
          fontWeight,
          lineHeight: 1.35,
          direction: "ltr"
        }}
      >
        {rtlText(text)}
      </div>
    </div>
  );
}

function AvatarBadge({
  sharer,
  size
}: {
  sharer: Sharer;
  size: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        border: `4px solid ${brandColors.ember}`,
        backgroundColor: brandColors.ember,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}
    >
      {sharer.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sharer.avatarDataUrl}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: "cover"
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            fontSize: Math.round(size * 0.42),
            color: brandColors.ink,
            fontWeight: 700,
            direction: "ltr"
          }}
        >
          {rtlText(sharer.initial)}
        </div>
      )}
    </div>
  );
}

export type RenderShareCardInput = {
  eventId: string;
  format: ShareCardFormat;
  userId?: string | null;
};

export async function renderShareCard(input: RenderShareCardInput) {
  const format = parseShareCardFormat(input.format);
  const size = shareCardSizes[format];
  const userId = parseShareCardUserId(input.userId ?? null);

  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      deletedAt: null,
      status: { in: publicEventStatuses }
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        include: { mediaAsset: true }
      },
      _count: {
        select: { registrations: { where: { status: "REGISTERED" } } }
      }
    }
  });

  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", "این برنامه پیدا نشد.", 404);
  }

  let coverDataUrl: string | null = null;
  if (event.images[0]?.mediaAssetId) {
    try {
      const media = await new MediaService().getStreamable(
        event.images[0].mediaAssetId
      );
      coverDataUrl = await toJpegDataUrl(media.buffer, media.contentType, {
        width: 1080,
        height: 1920
      });
    } catch (error) {
      logger.warn("share_card_cover_failed", {
        eventId: input.eventId,
        reason: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  const sharer = await loadSharer(userId);
  const fontData = await loadVazirmatnFont();
  const compact = format === "landscape";
  const titleSize = compact ? 36 : format === "story" ? 56 : 48;
  const pad = format === "story" ? 72 : compact ? 40 : 52;
  const avatarSize = compact ? 68 : format === "story" ? 104 : 88;
  const metaSize = compact ? 20 : 24;
  const eventNumber = event.eventNumber.toLocaleString("fa-IR");
  const companions = `${event._count.registrations.toLocaleString("fa-IR")} نفر همراه`;
  const dateLabel = faTehranDateFormatter.format(event.date);
  const meetingLine = `${MEETING_TIME_LABEL} ${timeFormatter.format(event.meetingTime)}`;
  const startLine = `${START_TIME_LABEL} ${timeFormatter.format(event.startTime)}`;
  const titleLines = wrapWords(event.title, compact ? 32 : 24, compact ? 2 : 3);
  const locationLines = wrapWords(event.locationName, compact ? 36 : 28, 2);
  const address = event.locationAddress?.replace(/\s+/g, " ").trim();
  const addressLines =
    address && !compact
      ? wrapWords(`نشانی ${address}`, 32, 2)
      : [];
  const brandLines = compact
    ? [`${APP_NAME} · برنامه ${eventNumber}`]
    : [APP_NAME, `برنامه شماره ${eventNumber}`];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          background: brandColors.ink,
          color: "white",
          padding: pad,
          fontFamily: fontData ? "Vazirmatn" : "sans-serif"
        }}
      >
        {coverDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverDataUrl}
            alt=""
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(28,16,8,0.25) 0%, rgba(28,16,8,0.88) 55%, rgba(28,16,8,0.96) 100%)",
            display: "flex"
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: compact ? 8 : 12,
            width: "100%"
          }}
        >
          {sharer ? (
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 16
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexGrow: 1
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "flex-end",
                    fontSize: compact ? 24 : 32,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    direction: "ltr"
                  }}
                >
                  {rtlText(sharer.displayName)}
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "flex-end",
                    fontSize: compact ? 16 : 22,
                    fontWeight: 700,
                    color: "#FDE68A",
                    direction: "ltr"
                  }}
                >
                  {rtlText("من توی این برنامه شرکت می‌کنم")}
                </div>
              </div>
              <AvatarBadge sharer={sharer} size={avatarSize} />
            </div>
          ) : null}
          {brandLines.map((line) => (
            <RtlLine key={line} text={line} fontSize={metaSize} color={brandColors.ember} />
          ))}
          {titleLines.map((line) => (
            <RtlLine
              key={line}
              text={line}
              fontSize={titleSize}
              color="#FFFFFF"
            />
          ))}
          <RtlLine text={dateLabel} fontSize={metaSize} color="#E2E8F0" />
          <RtlLine text={meetingLine} fontSize={metaSize} color="#E2E8F0" />
          <RtlLine text={startLine} fontSize={metaSize} color="#E2E8F0" />
          {locationLines.map((line) => (
            <RtlLine
              key={line}
              text={line}
              fontSize={compact ? 20 : 24}
              color="#CBD5E1"
            />
          ))}
          {addressLines.map((line) => (
            <RtlLine key={line} text={line} fontSize={20} color="#94A3B8" />
          ))}
          <RtlLine text={companions} fontSize={metaSize} color="#FBBF24" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Vazirmatn",
              data: fontData,
              style: "normal",
              weight: 700
            }
          ]
        : undefined
    }
  );
}

export async function renderShareCardPng(input: RenderShareCardInput) {
  const format = parseShareCardFormat(input.format);
  const size = shareCardSizes[format];
  const image = await renderShareCard({ ...input, format });
  return {
    buffer: Buffer.from(await image.arrayBuffer()),
    width: size.width,
    height: size.height,
    contentType: "image/png" as const
  };
}

export async function renderShareCardJpeg(input: RenderShareCardInput) {
  const png = await renderShareCardPng(input);
  try {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp(png.buffer)
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    return {
      buffer,
      width: png.width,
      height: png.height,
      contentType: "image/jpeg" as const
    };
  } catch (error) {
    logger.warn("share_card_jpeg_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return png;
  }
}
