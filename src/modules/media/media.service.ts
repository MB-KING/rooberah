import { MediaProvider } from "@prisma/client";
import { config } from "@/lib/config";
import {
  fetchTelegramFileBytes,
  uploadPhotoToTelegramStorage
} from "@/lib/media/telegram-media";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/shared/errors";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);

function guessMime(filename: string, mimeType?: string | null) {
  const normalized = (mimeType || "").toLowerCase().trim();
  if (normalized && ALLOWED_MIME.has(normalized)) return normalized;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return normalized || "image/jpeg";
}

export class MediaService {
  async createFromUpload(input: {
    uploaderId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }) {
    const mimeType = guessMime(input.filename, input.mimeType);
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new AppError("VALIDATION_ERROR", "Unsupported image type");
    }
    if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new AppError("VALIDATION_ERROR", "Image too large (max 5MB)");
    }
    if (input.buffer.byteLength < 32) {
      throw new AppError("VALIDATION_ERROR", "Image file is empty");
    }

    const storageChat =
      config.TELEGRAM_STORAGE_CHAT_ID || process.env.TELEGRAM_STORAGE_CHAT_ID;

    if (!storageChat) {
      throw new AppError(
        "VALIDATION_ERROR",
        "TELEGRAM_STORAGE_CHAT_ID روی سرور تنظیم نشده است."
      );
    }

    // Telegram sendPhoto is happiest with JPEG/PNG; normalize odd types.
    let uploadBuffer = input.buffer;
    let uploadMime = mimeType;
    let uploadName = input.filename || `upload-${Date.now()}.jpg`;
    if (mimeType === "image/webp" || mimeType === "image/gif") {
      try {
        const sharp = (await import("sharp")).default;
        uploadBuffer = await sharp(input.buffer).rotate().jpeg({ quality: 85 }).toBuffer();
        uploadMime = "image/jpeg";
        uploadName = uploadName.replace(/\.(webp|gif)$/i, ".jpg");
        if (!/\.jpe?g$/i.test(uploadName)) uploadName = `${uploadName}.jpg`;
      } catch {
        // fall through with original bytes
      }
    }

    try {
      const uploaded = await uploadPhotoToTelegramStorage({
        buffer: uploadBuffer,
        filename: uploadName,
        contentType: uploadMime
      });
      return prisma.mediaAsset.create({
        data: {
          provider: MediaProvider.TELEGRAM,
          telegramFileId: uploaded.fileId,
          telegramFileUniqueId: uploaded.fileUniqueId,
          mimeType: uploaded.mimeType,
          width: uploaded.width,
          height: uploaded.height,
          uploaderId: input.uploaderId
        }
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown telegram error";
      throw new AppError(
        "VALIDATION_ERROR",
        `آپلود به تلگرام ناموفق بود: ${reason}`
      );
    }
  }

  async getStreamable(mediaId: string) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset) {
      throw new AppError("NOT_FOUND", "Media not found");
    }

    if (asset.provider === MediaProvider.URL && asset.url) {
      if (asset.url.startsWith("data:")) {
        const match = /^data:([^;]+);base64,(.+)$/.exec(asset.url);
        if (!match) throw new AppError("NOT_FOUND", "Invalid media");
        return {
          buffer: Buffer.from(match[2], "base64"),
          contentType: match[1]
        };
      }
      const response = await fetch(asset.url, { cache: "no-store" });
      if (!response.ok) throw new AppError("NOT_FOUND", "Media unavailable");
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType:
          response.headers.get("content-type") ??
          asset.mimeType ??
          "application/octet-stream"
      };
    }

    if (!asset.telegramFileId) {
      throw new AppError("NOT_FOUND", "Media unavailable");
    }

    const file = await fetchTelegramFileBytes(asset.telegramFileId);
    return {
      buffer: file.buffer,
      contentType: asset.mimeType ?? file.contentType
    };
  }
}

export function mediaPublicPath(mediaId: string) {
  return `/api/media/${mediaId}`;
}

export function isStoredPhoto(url: string | null | undefined) {
  return !!url && (url.startsWith("/") || url.includes("/api/media/"));
}

/** Telegram profile photo links expire and 404. Keep a copy on our storage. */
export async function storeRemoteProfilePhoto(userId: string, url: string) {
  if (!url.startsWith("https://")) return null;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const asset = await new MediaService().createFromUpload({
    uploaderId: userId,
    buffer: Buffer.from(await response.arrayBuffer()),
    filename: "telegram-profile.jpg",
    mimeType: response.headers.get("content-type") || "image/jpeg"
  });
  return mediaPublicPath(asset.id);
}
