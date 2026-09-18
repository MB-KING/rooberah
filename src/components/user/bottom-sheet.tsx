"use client";

import { X } from "lucide-react";
import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { miniAppWidthClass } from "@/components/user/mini-app";
import { useDialogFocus } from "@/components/user/use-dialog-focus";

export function BottomSheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        tabIndex={-1}
        aria-label="بستن"
        className="absolute inset-0 cursor-pointer bg-black/55 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute bottom-0 left-1/2 flex w-full max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] -translate-x-1/2 flex-col overflow-hidden px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
          miniAppWidthClass
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-night shadow-[0_-12px_40px_rgba(0,0,0,0.45)] animate-sheet-up outline-none"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-3">
            <h3 id={titleId} className="text-base font-black text-white">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-slate-300 transition duration-200 active:scale-95"
              aria-label="بستن"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
