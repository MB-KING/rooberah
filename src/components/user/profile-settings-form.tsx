"use client";

import type { FormEvent, ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { updateProfileAction } from "@/app/actions";

const TEXT_SAVE_DELAY = 500;

export function ProfileSettingsForm({ children }: { children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | null>(null);
  const saveIdRef = useRef(0);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "invalid">(
    "idle"
  );
  const [message, setMessage] = useState("");

  function save() {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      setStatus("invalid");
      return;
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const data = new FormData(form);
    for (const input of form.querySelectorAll<HTMLInputElement>(
      'input[type="file"]'
    )) {
      input.value = "";
    }
    const requestId = ++saveIdRef.current;
    startTransition(async () => {
      const result = await updateProfileAction(data);
      if (requestId !== saveIdRef.current) return;
      setMessage(result.message);
      setStatus(result.ok ? "saved" : "error");
    });
  }

  function queueSave(immediate: boolean) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate) {
      save();
      return;
    }
    timerRef.current = window.setTimeout(save, TEXT_SAVE_DELAY);
  }

  function onFormChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement &&
        (target.type === "checkbox" ||
          target.type === "hidden" ||
          target.type === "file"))
    ) {
      queueSave(true);
      return;
    }
    queueSave(false);
  }

  function onFormBlur(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      if (target.type === "checkbox") return;
      queueSave(true);
    }
  }

  return (
    <form
      ref={formRef}
      className="grid gap-5"
      dir="rtl"
      onChange={onFormChange}
      onBlur={onFormBlur}
      onSubmit={(event) => {
        event.preventDefault();
        queueSave(true);
      }}
    >
      {children}
      <p
        role={status === "error" || status === "invalid" ? "alert" : undefined}
        aria-live={status === "error" || status === "invalid" ? "assertive" : "polite"}
        className={
          status === "error" || status === "invalid"
            ? "rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-center text-sm font-bold text-red-100"
            : "text-center text-xs font-bold text-slate-400"
        }
      >
        {pending
          ? "در حال ذخیره…"
          : status === "saved"
            ? "ذخیره شد"
            : status === "invalid"
              ? "نام و نام خانوادگی را پر کن."
              : status === "error"
                ? message || "ذخیره نشد. یک‌بار دیگر بزن."
                : "تغییرها خودکار ذخیره می‌شوند."}
      </p>
    </form>
  );
}
