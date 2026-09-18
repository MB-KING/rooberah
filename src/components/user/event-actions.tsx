"use client";

import { RegistrationStatus } from "@prisma/client";
import { CalendarCheck2, Loader2, LogOut, Send } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  cancelEventRegistrationAction,
  registerForEventAction
} from "@/app/actions";
import { APP_NAME } from "@/shared/brand";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  primaryActionClass,
  secondaryActionClass
} from "@/components/user/user-action-styles";

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
  autoRegister = false
}: {
  eventId: string;
  registrationStatus?: RegistrationStatus | null;
  requiresLogin?: boolean;
  autoRegister?: boolean;
}) {
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"checking" | "miniapp" | "widget">(
    "checking"
  );

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      let initData = readTelegramInitData();
      if (!initData) {
        for (let i = 0; i < 10 && !initData; i += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 150));
          initData = readTelegramInitData();
        }
      }
      if (!cancelled) {
        setMode(initData ? "miniapp" : "widget");
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  async function registerAfterLogin() {
    const formData = new FormData();
    formData.set("eventId", eventId);
    await registerForEventAction(formData);
  }

  function handleMiniAppClick() {
    setError(null);
    startTransition(async () => {
      try {
        const initData = readTelegramInitData();
        if (!initData) {
          setMode("widget");
          return;
        }
        await loginWithTelegramInitData(initData);
        await registerAfterLogin();
      } catch (err) {
        if (isRedirectError(err)) {
          throw err;
        }
        setError(
          `ورود از تلگرام انجام نشد. یک‌بار دیگر از داخل ربات ${APP_NAME} باز کن.`
        );
        router.refresh();
      }
    });
  }

  if (mode === "checking") {
    return (
      <p className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-300">
        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        در حال بررسی ورود…
      </p>
    );
  }

  if (mode === "widget") {
    return (
      <div className="grid gap-2">
        <p className="text-center text-xs font-bold text-slate-300">
          با تلگرام وارد شو
        </p>
        <TelegramLoginWidget nextPath={`/events/${eventId}?register=1`} />
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

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleMiniAppClick}
        className={primaryActionClass}
      >
        {pending ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            در حال ورود و ثبت‌نام…
          </>
        ) : (
          <>
            <Send size={17} aria-hidden="true" />
            ورود از تلگرام و ثبت‌نام
          </>
        )}
      </button>
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
