"use client";

import type { FormEvent, ReactNode } from "react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/actions";

const TEXT_SAVE_DELAY = 500;
const TOAST_ID = "profile-save";

export function ProfileSettingsForm({ children }: { children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | null>(null);
  const saveIdRef = useRef(0);
  const [, startTransition] = useTransition();

  function save() {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      toast.error("نام و نام خانوادگی را پر کن.", { id: TOAST_ID });
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
      if (result.ok) {
        toast.success("ذخیره شد", { id: TOAST_ID });
        return;
      }
      toast.error(result.message || "ذخیره نشد. یک‌بار دیگر بزن.", {
        id: TOAST_ID,
        duration: 5000
      });
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
    </form>
  );
}
