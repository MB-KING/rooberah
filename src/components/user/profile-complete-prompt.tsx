"use client";

import { UserRoundPen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/user/bottom-sheet";
import {
  primaryActionClass,
  secondaryActionClass
} from "@/components/user/user-action-styles";

const DISMISS_KEY = "rooberah_profile_prompt_dismissed";

export function ProfileCompletePrompt({
  needsCompletion
}: {
  needsCompletion: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!needsCompletion) {
      setOpen(false);
      return;
    }
    if (pathname?.startsWith("/me/settings")) {
      setOpen(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setOpen(false);
        return;
      }
    } catch {
      // ignore storage errors in WebView
    }
    setOpen(true);
  }, [needsCompletion, pathname]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <BottomSheet
      open={open}
      onClose={dismiss}
      title="اطلاعاتت را تکمیل کن"
    >
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-ember/25 bg-ember/10 p-3">
          <UserRoundPen
            className="mt-0.5 shrink-0 text-ember"
            aria-hidden="true"
          />
          <p className="text-sm leading-7 text-slate-200">
            برای نمایش بهتر بین همراهان، نام و نام‌خانوادگی و بقیه اطلاعات
            پروفایلت را تکمیل کن.
          </p>
        </div>
        <Link
          href="/me/settings"
          onClick={dismiss}
          className={primaryActionClass}
        >
          تکمیل پروفایل
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className={secondaryActionClass}
        >
          بعداً
        </button>
      </div>
    </BottomSheet>
  );
}
