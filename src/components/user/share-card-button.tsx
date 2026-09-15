"use client";

import { Loader2, Send, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/user/bottom-sheet";
import { APP_NAME } from "@/shared/brand";
import {
  primaryActionClass,
  secondaryActionClass
} from "@/components/user/user-action-styles";
import {
  canShareTelegramMessage,
  openExternalHttps,
  openTelegramShare,
  shareTelegramPreparedMessage
} from "@/lib/open-external";
import {
  linkedinShareUrl,
  telegramShareUrl,
  twitterShareUrl,
  type ShareCardFormat
} from "@/shared/share";

const formats = [
  { id: "story", label: "کارت استوری" },
  { id: "square", label: "کارت مربعی" },
  { id: "landscape", label: "کارت افقی" }
] as const;

type Preview = {
  format: ShareCardFormat;
  objectUrl: string;
};

function readTelegramInitData() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initData?.trim() || null;
}

export function ShareCardButton({
  eventId,
  shareUrl,
  shareText,
  telegramShareText,
  userId
}: {
  eventId: string;
  shareUrl: string;
  shareText: string;
  telegramShareText?: string;
  userId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewRequest = useRef(0);

  const loadPreview = useCallback(
    async (format: ShareCardFormat) => {
      const requestId = ++previewRequest.current;
      setBusy(format);
      setError(null);
      setSuccess(null);
      setPreview((current) => {
        if (current?.objectUrl) URL.revokeObjectURL(current.objectUrl);
        return null;
      });

      try {
        const params = new URLSearchParams({ format });
        if (userId) params.set("u", userId);
        const response = await fetch(
          `/api/events/${eventId}/share-card?${params.toString()}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          const text = (await response.text()).slice(0, 180);
          throw new Error(text || `ساخت کارت ناموفق بود (${response.status})`);
        }

        const blob = await response.blob();
        const contentType = response.headers.get("content-type") || blob.type;
        if (!contentType.includes("image") || blob.size < 64) {
          throw new Error("خروجی کارت تصویر معتبر نیست.");
        }

        const objectUrl = URL.createObjectURL(blob);
        if (requestId !== previewRequest.current) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreview({ format, objectUrl });
      } catch (err) {
        if (requestId !== previewRequest.current) return;
        setError(err instanceof Error ? err.message : "ساخت کارت ناموفق بود.");
      } finally {
        if (requestId === previewRequest.current) setBusy(null);
      }
    },
    [eventId, userId]
  );

  useEffect(() => {
    if (!open) return;
    void loadPreview("square");
  }, [open, loadPreview]);

  useEffect(() => {
    return () => {
      if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview?.objectUrl]);

  async function postShare(action: "dm" | "prepare") {
    const format = preview?.format ?? "square";
    const initData = readTelegramInitData();
    const response = await fetch(`/api/events/${eventId}/share-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(initData ? { "x-telegram-init-data": initData } : {})
      },
      body: JSON.stringify({ format, action })
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      preparedId?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(
        payload?.error || `ارسال ناموفق بود (${response.status})`
      );
    }
    return payload;
  }

  async function sendToMyTelegram() {
    setBusy("dm");
    setError(null);
    setSuccess(null);
    try {
      await postShare("dm");
      setSuccess(`عکس کارت به چت خصوصی‌ات با ربات ${APP_NAME} فرستاده شد.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ارسال عکس به تلگرام انجام نشد."
      );
    } finally {
      setBusy(null);
    }
  }

  async function shareOnTelegram() {
    setBusy("prepare");
    setError(null);
    setSuccess(null);
    try {
      const prepared = await postShare("prepare");
      if (prepared.preparedId && canShareTelegramMessage()) {
        const sent = await shareTelegramPreparedMessage(prepared.preparedId);
        if (sent) {
          setSuccess("کارت با عکس در تلگرام آماده ارسال شد.");
          return;
        }
        return;
      }

      await postShare("dm");
      setSuccess(
        "عکس کارت را برات تو چت ربات فرستادم. می‌تونی همان را برای دوستانت فوروارد کنی."
      );
    } catch {
      try {
        await postShare("dm");
        setSuccess(
          "عکس کارت را برات تو چت ربات فرستادم. می‌تونی همان را برای دوستانت فوروارد کنی."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "ارسال در تلگرام انجام نشد."
        );
        openTelegramShare(telegramShareUrl(shareUrl, telegramText));
      }
    } finally {
      setBusy(null);
    }
  }

  const telegramText = telegramShareText?.trim() || shareText.split("\n")[0] || shareText;
  const formatBusy =
    busy === "story" || busy === "square" || busy === "landscape";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${secondaryActionClass} mt-3`}
      >
        <Share2 size={16} aria-hidden="true" />
        دعوت دوستان
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="دعوت به برنامه"
      >
        <div className="grid gap-3" dir="rtl">
          <p className="text-sm leading-7 text-slate-300">{shareText}</p>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void shareOnTelegram()}
            className={primaryActionClass}
          >
            {busy === "prepare" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Share2 size={16} aria-hidden="true" />
            )}
            {busy === "prepare" ? "در حال آماده‌سازی…" : "ارسال در تلگرام"}
          </button>
          <button
            type="button"
            onClick={() => openExternalHttps(twitterShareUrl(shareUrl, telegramText))}
            className={`${secondaryActionClass}`}
          >
            اشتراک در ایکس
          </button>
          <button
            type="button"
            onClick={() => openExternalHttps(linkedinShareUrl(shareUrl))}
            className={`${secondaryActionClass}`}
          >
            اشتراک در لینکدین
          </button>

          <p className="pt-1 text-xs font-bold text-slate-400">
            کارت دعوت با اسم تو، تاریخ، ساعت جمع شدن، ساعت شروع و محل برنامه ساخته می‌شود.
          </p>
          {formats.map((format) => {
            const isBusy = busy === format.id;
            const selected = preview?.format === format.id;
            return (
              <button
                key={format.id}
                type="button"
                disabled={Boolean(busy)}
                aria-busy={isBusy || undefined}
                onClick={() => void loadPreview(format.id)}
                className={`${secondaryActionClass} cursor-pointer disabled:opacity-60 ${
                  selected ? "border-ember/50 text-white" : ""
                }`}
              >
                <span>{isBusy ? "در حال ساخت…" : format.label}</span>
                {isBusy ? (
                  <Loader2 size={16} className="animate-spin text-ember" />
                ) : null}
              </button>
            );
          })}

          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
              {success}
            </p>
          ) : null}

          {formatBusy && !preview ? (
            <p className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-slate-300">
              <Loader2 size={16} className="animate-spin text-ember" />
              در حال ساخت کارت…
            </p>
          ) : null}

          {preview ? (
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.objectUrl}
                alt="کارت دعوت"
                className="max-h-[min(36vh,28rem)] w-full rounded-xl bg-black/30 object-contain"
              />
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void sendToMyTelegram()}
                className={`${secondaryActionClass} cursor-pointer disabled:opacity-60`}
              >
                {busy === "dm" ? (
                  <Loader2 size={16} className="animate-spin text-ember" />
                ) : (
                  <Send size={16} aria-hidden="true" />
                )}
                {busy === "dm" ? "در حال ارسال…" : "بفرست تو تلگرام من"}
              </button>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
