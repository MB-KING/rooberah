"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { useDialogFocus } from "@/components/user/use-dialog-focus";

export function PhotoLightbox({
  src,
  alt,
  caption,
  children
}: {
  src: string;
  alt: string;
  caption?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/20 text-right transition duration-200"
      >
        {children}
      </button>
      {open ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          tabIndex={-1}
          className="fixed inset-0 z-[80] bg-black/95 animate-fade-in outline-none"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 z-[81] inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-black text-white transition duration-200 active:scale-95"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
            aria-label="بازگشت"
          >
            <X size={18} aria-hidden="true" />
            بازگشت
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-contain p-3 pt-16"
          />
          {caption ? (
            <p className="pointer-events-none absolute bottom-4 left-1/2 w-[min(92%,28rem)] -translate-x-1/2 truncate rounded-xl bg-black/60 px-3 py-2 text-center text-sm font-bold text-white">
              {caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
