"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

export function EventImageUploadForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    setOk(false);
    formData.set("eventId", eventId);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/images`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `آپلود ناموفق بود (${response.status})`);
      }

      setOk(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "آپلود ناموفق بود.");
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      {ok ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
          تصویر با موفقیت اضافه شد.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
          {error}
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        آپلود تصویر
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          required
          disabled={pending}
          className="text-sm text-slate-300"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        توضیح کوتاه
        <input
          name="caption"
          disabled={pending}
          className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white"
        />
      </label>
      <PendingSubmitButton
        className="w-full bg-white/10 text-sm font-bold text-white"
        pendingLabel="در حال آپلود…"
        disabled={pending}
      >
        افزودن تصویر
      </PendingSubmitButton>
    </form>
  );
}
