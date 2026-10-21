import { sendBroadcastAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";

export default async function BroadcastPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireSuperAdminPage();
  const { notice, error } = await searchParams;

  return (
    <>
      <PageTitle
        title="پیام عمومی"
        subtitle="در چت خصوصی ربات می‌رود. فقط برای کسانی که در تنظیمات خبر ربات را روشن گذاشته‌اند."
      />
      {notice ? (
        <AdminCard className="mb-4 border-[#F39C12]/40 bg-[#F39C12]/10">
          <p className="text-sm font-bold text-white">{notice}</p>
        </AdminCard>
      ) : null}
      {error ? (
        <AdminCard className="mb-4 border-red-400/30 bg-red-500/10">
          <p role="alert" className="text-sm font-bold text-red-200">
            {error}
          </p>
        </AdminCard>
      ) : null}
      <AdminCard>
        <form action={sendBroadcastAction} className="grid gap-3">
          <textarea
            name="message"
            required
            minLength={2}
            maxLength={1000}
            rows={6}
            placeholder="متن پیام"
            className="w-full rounded-xl border border-white/10 bg-[#1C1008] px-3 py-3 text-sm leading-7 text-white outline-none focus:border-[#F39C12]"
          />
          <Button type="submit" pendingLabel="در حال فرستادن…">
            فرستادن
          </Button>
        </form>
      </AdminCard>
    </>
  );
}
