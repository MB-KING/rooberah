"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NEED_VPN_EVENT, VpnNotice } from "@/components/telegram/telegram-provider";
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
  const [vpnNotice, setVpnNotice] = useState<{ ip: string; location: string } | null>(
    null
  );

  useEffect(() => {
    const onNeedVpn = (event: Event) => {
      const detail = (event as CustomEvent<{ ip?: string; location?: string }>).detail;
      if (detail?.ip) {
        setVpnNotice({ ip: detail.ip, location: detail.location || "ایران" });
      }
    };
    window.addEventListener(NEED_VPN_EVENT, onNeedVpn);
    const timer = window.setTimeout(() => {
      if (!insideTelegram()) setOutside(true);
    }, 2500);
    return () => {
      window.removeEventListener(NEED_VPN_EVENT, onNeedVpn);
      window.clearTimeout(timer);
    };
  }, []);

  if (vpnNotice) {
    return <VpnNotice ip={vpnNotice.ip} location={vpnNotice.location} />;
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
