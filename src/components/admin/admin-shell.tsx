import { Role } from "@prisma/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { miniAppWidthClass } from "@/components/user/mini-app";
import { hasRole } from "@/modules/auth/authorization";

type AdminShellUser = { roles: Array<{ role: Role }> };

export function AdminShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: AdminShellUser;
}) {
  const isSuperAdmin = hasRole(user, Role.SUPER_ADMIN);

  return (
    <main className="min-h-screen overflow-x-clip text-slate-100">
      <div
        className={`mx-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 ${miniAppWidthClass}`}
      >
        <header className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#2A160C]/80 px-3 py-2.5">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                پنل مدیریت
              </p>
              <p className="text-xs font-bold text-[#F39C12]">
                {isSuperAdmin ? "مدیریت کامل" : "مدیریت برنامه‌ها"}
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-bold text-slate-200 transition active:scale-95 hover:border-[#F39C12]/40"
          >
            <ArrowRight size={15} aria-hidden="true" />
            کاربر
          </Link>
        </header>
        <section className="min-w-0">{children}</section>
      </div>
      <AdminNav isSuperAdmin={isSuperAdmin} />
    </main>
  );
}
