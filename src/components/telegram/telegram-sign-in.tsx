"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";

function insideTelegram() {
  if (typeof window === "undefined") return false;
  return (
    /Telegram/i.test(window.navigator.userAgent) ||
    Boolean(window.Telegram?.WebApp)
  );
}

export function TelegramSignIn({ nextPath = "/" }: { nextPath?: string }) {
  const [outside, setOutside] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!insideTelegram()) setOutside(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (outside) {
    return <TelegramLoginWidget nextPath={nextPath} />;
  }

  return (
    <p className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-300">
      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
      در حال ورود…
    </p>
  );
}
