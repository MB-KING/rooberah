"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  children?: ReactNode;
};

export function Button({
  className,
  children,
  disabled,
  pendingLabel = "در حال انجام…",
  type = "button",
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus();
  const showPending = type === "submit" && pending;
  const isDisabled = Boolean(disabled || showPending);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={showPending || undefined}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ember px-4 text-sm font-black text-ink shadow-sm shadow-ember/20 transition duration-200 active:scale-[0.99] hover:bg-gold disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    >
      {showPending ? (
        <>
          <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
