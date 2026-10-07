"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  reloadAfterTelegramLogin,
  telegramLoginAlreadyRetried
} from "@/components/telegram/reload-after-login";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";

function readInitData() {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData?.trim() ?? "";
}

export function TelegramSignIn({ nextPath = "/" }: { nextPath?: string }) {
  const [browserLogin, setBrowserLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function signIn() {
      let initData = readInitData();
      for (let i = 0; i < 20 && !initData; i += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        initData = readInitData();
      }
      if (cancelled) return;
      if (!initData || telegramLoginAlreadyRetried()) {
        setBrowserLogin(true);
        return;
      }

      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData })
        });
        if (cancelled) return;
        if (!response.ok) {
          setBrowserLogin(true);
          return;
        }
        reloadAfterTelegramLogin();
      } catch {
        if (!cancelled) setBrowserLogin(true);
      }
    }

    void signIn();
    return () => {
      cancelled = true;
    };
  }, []);

  if (browserLogin) {
    return <TelegramLoginWidget nextPath={nextPath} />;
  }

  return (
    <p className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-300">
      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
      در حال ورود…
    </p>
  );
}
