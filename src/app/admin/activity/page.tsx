import { Activity, ScrollText } from "lucide-react";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";

const actionLabels: Record<string, string> = {
  EVENT_CREATED: "برنامه ساخته شد",
  EVENT_UPDATED: "برنامه ویرایش شد",
  EVENT_STATUS_CHANGED: "وضعیت برنامه تغییر کرد",
  ATTENDANCE_UPDATED: "حضور کاربر تغییر کرد",
  BUSINESS_CREATED: "کسب‌وکار ثبت شد",
  BUSINESS_UPDATED: "کسب‌وکار ویرایش شد",
  BUSINESS_STATUS_CHANGED: "وضعیت کسب‌وکار تغییر کرد",
  REWARD_CREATED: "مزیت ثبت شد",
  REWARD_UPDATED: "مزیت ویرایش شد",
  REWARD_STATUS_CHANGED: "وضعیت مزیت تغییر کرد",
  REWARD_CODES_ADDED: "کد مزیت اضافه شد",
  USER_ROLE_CHANGED: "نقش کاربر تغییر کرد",
  BADGE_CREATED: "نشان ساخته شد",
  BADGE_UPDATED: "نشان ویرایش شد",
  COMMUNITY_UPDATED: "تنظیمات جامعه تغییر کرد",
  LEVEL_SAVED: "سطح ذخیره شد"
};

export default async function AdminActivityPage() {
  await requireSuperAdminPage();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true }
  });

  return (
    <>
      <PageTitle
        title="گزارش فعالیت"
        subtitle="۱۰۰ تغییر اخیر مدیریتی برای پیگیری اینکه چه کسی، چه چیزی را و چه زمانی تغییر داده است."
      />
      <AdminCard className="mb-4 border-[#F39C12]/25 bg-[#2A160C]">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 text-[#F39C12]" />
          <div>
            <h2 className="font-black text-white">ردپای تغییرات</h2>
            <p className="mt-1 text-sm leading-7 text-slate-300">
              این گزارش فقط برای سوپرادمین نمایش داده می‌شود و عملیات حساس مثل
              تغییر نقش، وضعیت برنامه، حضور، مزیت و تنظیمات را ثبت می‌کند.
            </p>
          </div>
        </div>
      </AdminCard>
      <div className="grid gap-2">
        {logs.length === 0 ? (
          <AdminCard className="py-10 text-center">
            <ScrollText className="mx-auto text-slate-500" />
            <p className="mt-3 text-sm text-slate-400">
              هنوز فعالیتی ثبت نشده است.
            </p>
          </AdminCard>
        ) : (
          logs.map((log) => {
            const actor = log.actor
              ? [log.actor.firstName, log.actor.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                log.actor.username ||
                "کاربر"
              : "سیستم";
            return (
              <AdminCard key={log.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {actionLabels[log.action] ?? log.action}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      توسط {actor} · {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "short",
                      timeStyle: "short"
                    }).format(log.createdAt)}
                  </time>
                </div>
              </AdminCard>
            );
          })
        )}
      </div>
    </>
  );
}
