"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { primaryActionClass } from "@/components/user/user-action-styles";
import { MAX_EVENT_PHOTOS_PER_USER } from "@/shared/event-photos";
import { errorMessagesFa, type ErrorCode } from "@/shared/errors";

export function EventPhotoUploadForm({
  eventId,
  uploadedCount
}: {
  eventId: string;
  uploadedCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const remaining = Math.max(MAX_EVENT_PHOTOS_PER_USER - uploadedCount, 0);

  async function onSubmit(formData: FormData) {
    setError(null);
    setOk(false);
    try {
      const response = await fetch(`/api/events/${eventId}/photos`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        code?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        const code = payload?.code;
        const mapped =
          code && code in errorMessagesFa
            ? errorMessagesFa[code as ErrorCode]
            : payload?.error;
        throw new Error(mapped || `آپلود ناموفق بود (${response.status})`);
      }

      setOk(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "آپلود ناموفق بود.");
    }
  }

  if (remaining <= 0) {
    return (
      <p className="mt-3 text-sm leading-7 text-slate-400">
        سقف آپلود عکس برای این برنامه پر شده است.
      </p>
    );
  }

  return (
    <form action={onSubmit} className="mt-3 grid gap-3">
      {ok ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
          عکس ارسال شد و بعد از تأیید ادمین در آرشیو نمایش داده می‌شود.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
          {error}
        </p>
      ) : null}
      <p className="text-sm leading-7 text-slate-400">
        تا {remaining.toLocaleString("fa-IR")} عکس دیگر می‌توانی بفرستی. دو
        عکس تأییدشده اول امتیاز می‌گیرند.
      </p>
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        عکس برنامه
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          required
          disabled={pending}
          className="cursor-pointer text-sm text-slate-300"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        توضیح کوتاه (اختیاری)
        <input
          name="caption"
          maxLength={200}
          disabled={pending}
          className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white"
          placeholder="مثلاً قله، گروه، مسیر"
        />
      </label>
      <PendingSubmitButton
        className={primaryActionClass}
        pendingLabel="در حال آپلود…"
        disabled={pending}
        idleIcon={<ImagePlus size={16} aria-hidden="true" />}
      >
        ارسال عکس
      </PendingSubmitButton>
    </form>
  );
}
