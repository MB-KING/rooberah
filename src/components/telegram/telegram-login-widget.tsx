"use client";

import { Send } from "lucide-react";
import { useVpnNotice, VpnNotice } from "@/components/telegram/telegram-provider";
import { cn } from "@/lib/cn";
import { safeInternalPath } from "@/lib/safe-internal-path";

export function TelegramLoginWidget({
  nextPath = "/",
  className
}: {
  nextPath?: string;
  onSuccess?: () => Promise<void> | void;
  className?: string;
}) {
  const notice = useVpnNotice();
  const next = safeInternalPath(nextPath);
  const href =
    next === "/"
      ? "/api/auth/telegram-oidc/start"
      : `/api/auth/telegram-oidc/start?next=${encodeURIComponent(next)}`;

  return (
    <div className="grid gap-3">
      {notice ? <VpnNotice ip={notice.ip} location={notice.location} /> : null}
      <a
        href={href}
        className={cn(
          "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#F39C12] px-4 text-sm font-black text-[#1C1008]",
          className
        )}
      >
        <Send size={17} aria-hidden="true" />
        ورود با تلگرام
      </a>
    </div>
  );
}
