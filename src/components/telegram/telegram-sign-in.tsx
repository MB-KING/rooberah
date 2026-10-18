"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useVpnNotice, VpnNotice } from "@/components/telegram/telegram-provider";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";

function insideTelegram() {
  if (typeof window === "undefined") return false;
  return (
    /Telegram/i.test(window.navigator.userAgent) ||
    Boolean(window.Telegram?.WebApp)
  );
}

export function TelegramSignIn({ nextPath = "/" }: { nextPath?: string }) {
  const [settled, setSettled] = useState(false);
  const [outside, setOutside] = useState(false);
  const vpnNotice = useVpnNotice();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOutside(!insideTelegram());
      setSettled(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (outside) {
    return <TelegramLoginWidget nextPath={nextPath} />;
  }

  if (settled && vpnNotice) {
    return <VpnNotice ip={vpnNotice.ip} location={vpnNotice.location} />;
  }

  return (
    <p className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-300">
      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
      در حال ورود…
    </p>
  );
}
