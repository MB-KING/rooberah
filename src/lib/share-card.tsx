import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { persianForOg } from "@/lib/persian-og-text";
import {
  faTehranDateShortFormatter,
  faTehranTimeFormatter
} from "@/lib/tehran-time";
import { APP_SLOGAN, brandColors } from "@/shared/brand";
import { MediaService } from "@/modules/media/media.service";
import { publicEventStatuses } from "@/modules/events/event.repository";
import { shownProfilePhoto } from "@/shared/profile-photo";
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

const MEDIA_ID_RE = /\/api\/media\/([0-9a-f-]{36})/i;

async function readPhotoBuffer(url: string) {
  const mediaId = MEDIA_ID_RE.exec(url)?.[1];
  if (mediaId) {
    const file = await new MediaService().getStreamable(mediaId);
    return file.buffer;
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) return null;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  return Buffer.from(await response.arrayBuffer());
}

/** Small jpeg data URL. Satori cannot fetch our own /api/media path. */
async function loadAvatarDataUrl(url: string | null) {
  if (!url) return null;
  try {
    const buffer = await readPhotoBuffer(url);
    if (!buffer || buffer.byteLength < 32 || buffer.byteLength > 8_000_000) {
      return null;
    }
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(buffer)
      .rotate()
      .resize(192, 192, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (error) {
    logger.warn("share card avatar skipped", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

async function loadSharer(userId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      photoUrl: true,
      telegramPhotoUrl: true
    }
  });
  if (!user) return null;
  const name = getDisplayName(user);
  const photo = await loadAvatarDataUrl(shownProfilePhoto(user));
  return { name, photo };
}

let logoPromise: Promise<string | null> | null = null;

/** Keep the white letters. Only the outer white paper becomes transparent. */
async function loadLogoDataUrl() {
  logoPromise ??= (async () => {
    try {
      const file = join(process.cwd(), "public/brand/roobeh-rah-icon.jpg");
      const input = await readFile(file);
      const sharp = (await import("sharp")).default;
      const { data, info } = await sharp(input)
        .resize(720, 720, { fit: "inside" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixels = Buffer.from(data);
      const count = info.width * info.height;
      const white = (index: number) => {
        const offset = index * 4;
        return (
          pixels[offset] > 236 &&
          pixels[offset + 1] > 236 &&
          pixels[offset + 2] > 236
        );
      };
      const seen = new Uint8Array(count);
      const stack: number[] = [];
      const push = (index: number) => {
        if (index < 0 || index >= count || seen[index] || !white(index)) return;
        seen[index] = 1;
        stack.push(index);
      };
      for (let x = 0; x < info.width; x += 1) {
        push(x);
        push((info.height - 1) * info.width + x);
      }
      for (let y = 0; y < info.height; y += 1) {
        push(y * info.width);
        push(y * info.width + info.width - 1);
      }
      while (stack.length > 0) {
        const index = stack.pop() as number;
        pixels[index * 4 + 3] = 0;
        const x = index % info.width;
        const y = (index - x) / info.width;
        if (x > 0) push(index - 1);
        if (x + 1 < info.width) push(index + 1);
        if (y > 0) push(index - info.width);
        if (y + 1 < info.height) push(index + info.width);
      }
      const png = await sharp(pixels, {
        raw: { width: info.width, height: info.height, channels: 4 }
      })
        .trim()
        .png()
        .toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch (error) {
      logger.warn("share card logo skipped", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      return null;
    }
  })();
  return logoPromise;
}

function RtlLine({
  text,
  fontSize,
  color,
  fontWeight = 700,
  hug = false,
  center = false
}: {
  text: string;
  fontSize: number;
  color: string;
  fontWeight?: number;
  hug?: boolean;
  center?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        ...(hug ? {} : { width: "100%" }),
        justifyContent: center ? "center" : "flex-end"
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

function Pill({
  text,
  fontSize,
  background,
  color,
  border
}: {
  text: string;
  fontSize: number;
  background: string;
  color: string;
  border?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        color,
        border: border ?? "0 solid transparent",
        borderRadius: 999,
        padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
        fontSize,
        fontWeight: 700,
        direction: "ltr",
        lineHeight: 1.2
      }}
    >
      {rtlText(text)}
    </div>
  );
}

function Inviter({
  name,
  photo,
  fontSize,
  avatar
}: {
  name: string;
  photo: string | null;
  fontSize: number;
  avatar: number;
}) {
  const initial = name.trim().charAt(0) || "ر";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 16
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          fontSize,
          color: "#A56B32",
          fontWeight: 700,
          lineHeight: 1.35,
          direction: "ltr"
        }}
      >
        {rtlText(name)}
      </div>
      {photo ? (
        <img
          src={photo}
          width={avatar}
          height={avatar}
          style={{
            width: avatar,
            height: avatar,
            borderRadius: avatar,
            objectFit: "cover",
            border: "4px solid #FFFFFF"
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width: avatar,
            height: avatar,
            borderRadius: avatar,
            background: "#F39C12",
            color: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(avatar * 0.42),
            fontWeight: 700,
            direction: "ltr",
            border: "4px solid #FFFFFF"
          }}
        >
          {rtlText(initial)}
        </div>
      )}
    </div>
  );
}

function Circle({
  size,
  color,
  top,
  left,
  right,
  bottom
}: {
  size: number;
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        ...(typeof top === "number" ? { top } : {}),
        ...(typeof left === "number" ? { left } : {}),
        ...(typeof right === "number" ? { right } : {}),
        ...(typeof bottom === "number" ? { bottom } : {})
      }}
    />
  );
}

function Field({
  label,
  text,
  fontSize
}: {
  label: string;
  text: string;
  fontSize: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        boxSizing: "border-box",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#FFFFFF",
        borderRadius: 24,
        border: "3px solid #F6D7B0",
        padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.7)}px`
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 700,
          color: "#5C4030",
          lineHeight: 1.3,
          direction: "ltr"
        }}
      >
        {rtlText(text)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 700,
          color: "#E07A12",
          lineHeight: 1.3,
          direction: "ltr"
        }}
      >
        {rtlText(label)}
      </div>
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
    select: {
      title: true,
      eventNumber: true,
      date: true,
      startTime: true,
      locationName: true
    }
  });

  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", "این برنامه پیدا نشد.", 404);
  }

  const [sharer, fontData, logo] = await Promise.all([
    loadSharer(userId),
    loadVazirmatnFont(),
    loadLogoDataUrl()
  ]);
  const compact = format === "landscape";
  const story = format === "story";
  const titleSize = compact ? 34 : story ? 60 : 44;
  const metaSize = compact ? 24 : story ? 34 : 28;
  const pad = story ? 44 : compact ? 22 : 28;
  const footer = story ? 112 : compact ? 64 : 84;
  const gap = compact ? 16 : story ? 22 : 14;
  const logoSize = compact ? 268 : story ? 500 : 260;
  const logoBox = compact ? 320 : logoSize;
  const detailsWidth = size.width - pad * 2 - gap - logoBox;
  const eventNumber = event.eventNumber.toLocaleString("fa-IR");
  const dateLabel = faTehranDateShortFormatter.format(event.date);
  const timeLabel = timeFormatter.format(event.startTime);
  const titleLines = wrapWords(event.title, compact ? 22 : story ? 18 : 18, 2);
  const location = shorten(event.locationName, compact ? 28 : 26);
  const fontFamily = fontData ? "Vazirmatn" : "sans-serif";

  const details = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexShrink: 0,
        justifyContent: "space-between",
        gap: compact ? 8 : story ? 16 : 12,
        width: compact ? detailsWidth : "100%"
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "flex-end",
          alignItems: "center"
        }}
      >
        <Pill
          text={`برنامه ${eventNumber}`}
          fontSize={metaSize}
          background={brandColors.red}
          color="#FFFFFF"
        />
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          boxSizing: "border-box",
          flexDirection: "column",
          alignItems: "center",
          background: "#FFFFFF",
          borderRadius: story ? 36 : 24,
          border: "3px solid #F6D7B0",
          padding: story ? 28 : compact ? 14 : 20,
          gap: 4
        }}
      >
        {titleLines.map((line) => (
          <RtlLine key={line} text={line} fontSize={titleSize} color={brandColors.ink} center />
        ))}
      </div>
      <Field label="تاریخ" text={dateLabel} fontSize={metaSize} />
      <Field label="ساعت" text={timeLabel} fontSize={metaSize} />
      <Field label="محل" text={location} fontSize={metaSize} />
      {sharer ? (
        <div
          style={{
            display: "flex",
            width: "100%",
            boxSizing: "border-box",
            flexDirection: "column",
            alignItems: "flex-end",
            background: "#FFFFFF",
            borderRadius: 24,
            border: "3px solid #F6D7B0",
            padding: compact ? 12 : 16,
            gap: compact ? 4 : 6
          }}
        >
          <Inviter
            name={shorten(sharer.name, compact ? 22 : 28)}
            photo={sharer.photo}
            fontSize={compact ? 22 : story ? 32 : 26}
            avatar={compact ? 52 : story ? 84 : 64}
          />
          <RtlLine
            text="من توی این برنامه شرکت می‌کنم"
            fontSize={compact ? 20 : story ? 30 : 24}
            color="#5C4030"
          />
          <RtlLine
            text="اگر تو هم می‌آی خوشحال می‌شم ببینمت"
            fontSize={compact ? 20 : story ? 30 : 24}
            color="#E07A12"
          />
        </div>
      ) : null}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(165deg, #FFE7BF 0%, #FFF6EE 42%, #FFF6EE 100%)",
          color: brandColors.ink,
          fontFamily
        }}
      >
        <Circle
          size={story ? 720 : compact ? 280 : 480}
          color="#F5C518"
          top={story ? -240 : compact ? -70 : -150}
          left={story ? -200 : compact ? -70 : -140}
        />
        <Circle
          size={story ? 520 : compact ? 180 : 380}
          color={brandColors.red}
          top={story ? -180 : compact ? -70 : -120}
          right={story ? -180 : compact ? -60 : -130}
        />
        <Circle
          size={story ? 620 : compact ? 240 : 400}
          color="#F39C12"
          bottom={story ? -140 : compact ? -80 : -130}
          left={story ? -160 : compact ? -50 : -110}
        />
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            flexDirection: compact ? "row" : "column",
            alignItems: compact ? "stretch" : "center",
            padding: pad,
            gap,
            zIndex: 1
          }}
        >
          {logo ? (
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                width: compact ? logoBox : "100%"
              }}
            >
              <img
                src={logo}
                width={logoSize}
                height={logoSize}
                style={{ width: logoSize, height: logoSize }}
              />
            </div>
          ) : null}
          {details}
        </div>
        <div
          style={{
            display: "flex",
            height: footer,
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(90deg, #F39C12 0%, #E85D04 100%)",
            zIndex: 1
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: metaSize,
              fontWeight: 700,
              color: "#FFFFFF",
              direction: "ltr"
            }}
          >
            {rtlText(APP_SLOGAN)}
          </div>
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
