"use client";

import { RegistrationStatus } from "@prisma/client";
import { CalendarCheck2, Loader2, LogOut } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useEffect, useRef, useState } from "react";
import {
  cancelEventRegistrationAction,
  registerForEventAction
} from "@/app/actions";
import { reloadAfterTelegramLogin } from "@/components/telegram/reload-after-login";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { secondaryActionClass } from "@/components/user/user-action-styles";

function readTelegramInitData() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initData?.trim() || null;
}

async function loginWithTelegramInitData(initData: string) {
  const response = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData })
  });
  if (!response.ok) {
    throw new Error("telegram_login_failed");
  }
}

export function EventActions({
  eventId,
  registrationStatus,
  requiresLogin = false,
  autoRegister = false,
  membershipBlocked = false
}: {
  eventId: string;
  registrationStatus?: RegistrationStatus | null;
  requiresLogin?: boolean;
  autoRegister?: boolean;
  membershipBlocked?: boolean;
}) {
  if (membershipBlocked) {
    return (
      <p className="text-center text-sm font-bold leading-6 text-ember">
        اول عضو کانال و گروه شو، بعد ثبت‌نام کن.
      </p>
    );
  }

  if (autoRegister) {
    return <AutoRegisterAfterLogin eventId={eventId} />;
  }

  if (requiresLogin) {
    return <LoginThenRegisterButton eventId={eventId} />;
  }

  if (
    registrationStatus === RegistrationStatus.REGISTERED ||
    registrationStatus === RegistrationStatus.WAITLISTED
  ) {
    return (
      <form action={cancelEventRegistrationAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <PendingSubmitButton
          className={`${secondaryActionClass} border-red-400/30 text-red-200 hover:border-red-400/50 hover:bg-red-500/10`}
          pendingLabel="در حال لغو…"
          idleIcon={<LogOut size={16} aria-hidden="true" />}
        >
          {registrationStatus === RegistrationStatus.WAITLISTED
            ? "خروج از لیست انتظار"
            : "لغو ثبت‌نام"}
        </PendingSubmitButton>
      </form>
    );
  }

  return (
    <form action={registerForEventAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <Button
        className="w-full"
        type="submit"
        pendingLabel="در حال ثبت‌نام…"
      >
        <CalendarCheck2 size={17} aria-hidden="true" />
        ثبت‌نام و رزرو جا
      </Button>
    </form>
  );
}

function AutoRegisterAfterLogin({ eventId }: { eventId: string }) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const formData = new FormData();
    formData.set("eventId", eventId);
    void registerForEventAction(formData).catch((err) => {
      if (isRedirectError(err)) {
        throw err;
      }
      setError("ثبت‌نام بعد از ورود انجام نشد. دکمه ثبت‌نام را بزن.");
    });
  }, [eventId]);

  return (
    <div className="grid gap-2">
      <p className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-slate-200">
        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        در حال ثبت‌نام…
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LoginThenRegisterButton({ eventId }: { eventId: string }) {
  const [mode, setMode] = useState<"checking" | "widget">("checking");

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      let initData = readTelegramInitData();
      if (!initData) {
        for (let i = 0; i < 20 && !initData; i += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
          initData = readTelegramInitData();
        }
      }
      if (cancelled) return;
      if (!initData) {
        setMode("widget");
        return;
      }
      try {
        await loginWithTelegramInitData(initData);
        if (!reloadAfterTelegramLogin()) setMode("widget");
      } catch (err) {
        if (isRedirectError(err)) throw err;
        if (!cancelled) setMode("widget");
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "checking") {
    return (
      <p className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-300">
        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        در حال ورود…
      </p>
    );
  }

  return (
    <TelegramLoginWidget nextPath={`/events/${eventId}?register=1`} />
  );
}
