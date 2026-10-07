"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  postTelegramInitData,
  reloadAfterTelegramLogin
} from "@/components/telegram/reload-after-login";
import { pathFromStartParam } from "@/lib/telegram-format";

const START_PARAM_KEY = "rooberah_start_param";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openLink?: (
          url: string,
          options?: { try_instant_view?: boolean }
        ) => void;
        openTelegramLink?: (url: string) => void;
        downloadFile?: (
          params: { url: string; file_name: string },
          callback?: (ok: boolean) => void
        ) => void;
        shareMessage?: (
          msgId: string,
          callback?: (sent: boolean) => void
        ) => void;
      };
    };
  }
}

function resolveStartPath(webApp: NonNullable<Window["Telegram"]>["WebApp"]) {
  const fromHash = window.location.hash.replace(/^#/, "").trim();
  const fromQuery = new URLSearchParams(window.location.search).get("e")?.trim() ?? "";
  const fromUnsafe = webApp?.initDataUnsafe?.start_param?.trim();
  const param = fromUnsafe || fromQuery || fromHash;
  if (param) {
    try {
      sessionStorage.setItem(START_PARAM_KEY, param);
    } catch {
      // ignore storage failures in restricted WebViews
    }
    return pathFromStartParam(param);
  }

  try {
    const cached = sessionStorage.getItem(START_PARAM_KEY);
    if (cached) {
      sessionStorage.removeItem(START_PARAM_KEY);
      return pathFromStartParam(cached);
    }
  } catch {
    // ignore
  }

  return null;
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [scriptReady, setScriptReady] = useState(false);
  const bootstrapped = useRef(false);

  const bootstrap = useCallback(async () => {
    if (bootstrapped.current || typeof window === "undefined") {
      return;
    }

    // Telegram sometimes injects WebApp after the script onLoad fires.
    let webApp = window.Telegram?.WebApp;
    let initData = webApp?.initData?.trim();
    for (let i = 0; i < 20 && (!webApp || !initData); i += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      webApp = window.Telegram?.WebApp;
      initData = webApp?.initData?.trim();
    }

    if (!webApp || !initData) {
      return;
    }

    bootstrapped.current = true;
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor?.("#2A160C");
    webApp.setBackgroundColor?.("#1C1008");

    try {
      await postTelegramInitData(initData);
      const deepPath = resolveStartPath(webApp);
      reloadAfterTelegramLogin(
        deepPath && deepPath !== window.location.pathname ? deepPath : undefined
      );
    } catch {
      bootstrapped.current = false;
    }
  }, []);

  useEffect(() => {
    if (scriptReady) {
      void bootstrap();
    }
  }, [bootstrap, scriptReady]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      {children}
    </>
  );
}
