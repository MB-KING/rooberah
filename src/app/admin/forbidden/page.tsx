import { ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { requireAdminPage } from "@/modules/auth/admin-session";

export default async function AdminForbiddenPage() {
  await requireAdminPage();

  return (
    <>
      <PageTitle title="دسترسی محدود" subtitle="حساب شما اجازه ورود به این بخش را ندارد." />
      <AdminCard className="border-amber-400/25 bg-[#2A160C] py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-black text-white">این بخش مخصوص سوپرادمین است</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-300">
          ادمین‌ها می‌توانند برنامه‌ها و حضور و غیاب را مدیریت کنند. مدیریت اعضا، نقش‌ها، نشان‌ها و تنظیمات کلی فقط در اختیار سوپرادمین است.
        </p>
        <Link href="/admin" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#F39C12] px-5 text-sm font-black text-[#1C1008]">
          <ArrowRight size={17} aria-hidden="true" />
          بازگشت به داشبورد
        </Link>
      </AdminCard>
    </>
  );
}
