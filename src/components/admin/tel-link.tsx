"use client";

export function TelLink({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="shrink-0 text-sm font-bold text-[#F39C12] underline"
      dir="ltr"
      href={href}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
