"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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
