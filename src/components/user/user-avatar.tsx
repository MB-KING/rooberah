"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function usablePhoto(url?: string | null) {
  return (
    !!url &&
    (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://"))
  );
}

export function UserAvatar({
  photoUrl,
  name,
  size = 56,
  className
}: {
  photoUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = usablePhoto(photoUrl) && !failed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-white/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      {show ? (
        <Image
          src={photoUrl!}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ember">
          <UserRound size={Math.round(size * 0.45)} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function MemberPhoto({
  photoUrl,
  name,
  children
}: {
  photoUrl?: string | null;
  name: string;
  children: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const show = usablePhoto(photoUrl) && !failed;

  return (
    <>
      {show ? (
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl bg-white/10">
          {photoUrl!.startsWith("/") ? (
            <Image
              src={photoUrl!}
              alt={name}
              fill
              sizes="(max-width: 480px) 100vw, 420px"
              className="object-cover"
              unoptimized
              onError={() => setFailed(true)}
            />
          ) : (
            <img
              src={photoUrl!}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        {show ? null : <UserAvatar photoUrl={null} name={name} size={56} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
