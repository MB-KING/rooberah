"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NEED_VPN_EVENT } from "@/components/telegram/telegram-provider";
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
  const [needVpn, setNeedVpn] = useState(false);

  useEffect(() => {
    const onNeedVpn = () => setNeedVpn(true);
    window.addEventListener(NEED_VPN_EVENT, onNeedVpn);
    const timer = window.setTimeout(() => {
      if (!insideTelegram()) setOutside(true);
    }, 2500);
    return () => {
      window.removeEventListener(NEED_VPN_EVENT, onNeedVpn);
      window.clearTimeout(timer);
    };
  }, []);

  if (needVpn) {
    return (
      <p className="text-center text-sm font-bold leading-7 text-slate-200">
        وی‌پی‌ان خاموش است. روشن کن و دوباره از ربات وارد شو.
      </p>
    );
  }

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
