import Image from "next/image";
import { APP_NAME, BRAND_ICON_SRC } from "@/shared/brand";
import { cn } from "@/lib/cn";

export function BrandMark({
  size = 40,
  className,
  priority = false
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={BRAND_ICON_SRC}
        alt={APP_NAME}
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority={priority}
        unoptimized
      />
    </div>
  );
}
