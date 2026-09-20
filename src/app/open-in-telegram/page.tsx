import { Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { TelegramLoginWidget } from "@/components/telegram/telegram-login-widget";
import { UserCard } from "@/components/user/user-card";
import {
  secondaryActionClass,
  UserPageShell
} from "@/components/user/user-shell";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { botUsername } from "@/lib/telegram-format";
import { getOptionalCurrentUser } from "@/modules/auth/session";

export default async function OpenInTelegramPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const nextPath = safeInternalPath(next);
  const user = await getOptionalCurrentUser();
  if (user) {
    redirect(nextPath as never);
  }

  const username = botUsername();
  const botHref = `https://t.me/${username}`;

  return (
    <UserPageShell>
      <UserCard className="mt-8 text-center">
        <div className="mx-auto flex justify-center">
          <BrandMark size={72} />
        </div>
        <h1 className="mt-4 text-2xl font-black text-white">با تلگرام وارد شو</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          اگر از مرورگر موبایل یا دسکتاپ آمدی، با همان حساب تلگرام وارد شو.
          داخل مینی‌اپ تلگرام ورود خودکار است.
        </p>
        {error === "UNAUTHORIZED" ? (
          <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-200">
            ورود انجام نشد. یک‌بار دیگر با تلگرام وارد شو.
          </p>
        ) : null}
        <div className="mt-6">
          <TelegramLoginWidget nextPath={nextPath} />
        </div>
        <a
          href={botHref}
          target="_blank"
          rel="noreferrer"
          className={`${secondaryActionClass} mt-6`}
        >
          <Send size={17} aria-hidden="true" />
          باز کردن ربات @{username}
        </a>
        <Link
          href="/"
          className={`${secondaryActionClass} mt-3`}
        >
          بازگشت به خانه
        </Link>
      </UserCard>
    </UserPageShell>
  );
}
