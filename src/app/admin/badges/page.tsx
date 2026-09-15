import { BadgeType } from "@prisma/client";
import { createBadgeAction, updateBadgeAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";

const badgeTypeLabels: Record<BadgeType, string> = {
  ATTENDANCE_COUNT: "تعداد حضور",
  XP: "امتیاز",
  SPECIAL: "ویژه"
};

export default async function AdminBadgesPage() {
  const admin = await requireSuperAdminPage();
  const badges = await prisma.badge.findMany({
    where: { communityId: admin.communityId },
    orderBy: [{ sortOrder: "asc" }, { threshold: "asc" }]
  });

  return (
    <>
      <PageTitle title="مدیریت نشان‌ها" subtitle="نشان‌ها افتخارهایی هستند که اعضا با حضور، امتیاز یا انتخاب ویژه دریافت می‌کنند." />
      <AdminCard className="mb-4 border-[#F39C12]/25 bg-[#2A160C]">
        <h2 className="font-black text-white">نشان به چه درد می‌خورد؟</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          نشان یک افتخار داخل پروفایل عضو است. مثلا «قدم اول» برای اولین حضور یا «هم‌قدم» برای چند حضور پشت سر هم. نشان‌ها حس پیشرفت می‌دهند و کمک می‌کنند اعضای فعال دیده شوند.
        </p>
      </AdminCard>

      <AdminCard className="mb-4">
        <h2 className="mb-4 font-black text-white">نشان جدید</h2>
        <BadgeForm action={createBadgeAction} submitLabel="ساخت نشان" />
      </AdminCard>

      <div className="grid gap-3">
        {badges.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-slate-300">هنوز نشانی تعریف نشده است.</p>
          </AdminCard>
        ) : (
          badges.map((badge) => (
            <AdminCard key={badge.id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-white">{badge.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{badge.description ?? "بدون توضیح"}</p>
                  <p className="mt-2 text-xs font-bold text-[#F39C12]">
                    {badgeTypeLabels[badge.type]}، حدنصاب {badge.threshold}، {badge.isActive ? "فعال" : "غیرفعال"}
                  </p>
                </div>
                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">{badge.slug}</span>
              </div>
              <BadgeForm action={updateBadgeAction} badge={badge} submitLabel="ذخیره تغییرات" />
            </AdminCard>
          ))
        )}
      </div>
    </>
  );
}

function BadgeForm({
  action,
  badge,
  submitLabel
}: {
  action: (formData: FormData) => void | Promise<void>;
  badge?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    type: BadgeType;
    threshold: number;
    sortOrder: number;
    isActive: boolean;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      {badge ? <input type="hidden" name="badgeId" value={badge.id} /> : null}
      <Field name="name" label="نام نشان" defaultValue={badge?.name} placeholder="قدم اول" required />
      <Field name="slug" label="شناسه انگلیسی" defaultValue={badge?.slug} placeholder="first-step" required />
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        نوع نشان
        <select name="type" defaultValue={badge?.type ?? BadgeType.ATTENDANCE_COUNT} className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]">
          {Object.entries(badgeTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Field name="threshold" label="حدنصاب دریافت" type="number" defaultValue={String(badge?.threshold ?? 1)} required />
      <Field name="icon" label="نام آیکن" defaultValue={badge?.icon ?? ""} placeholder="Footprints" />
      <Field name="sortOrder" label="ترتیب نمایش" type="number" defaultValue={String(badge?.sortOrder ?? 0)} />
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        توضیحات
        <textarea name="description" rows={3} defaultValue={badge?.description ?? ""} className="rounded-xl border border-white/10 bg-[#1C1008] px-3 py-3 text-white outline-none focus:border-[#F39C12]" />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
        <input name="isActive" type="checkbox" defaultChecked={badge?.isActive ?? true} className="h-4 w-4 accent-[#F39C12]" />
        فعال باشد
      </label>
      <div>
        <Button type="submit" className="w-full" pendingLabel="در حال ذخیره…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
    </label>
  );
}
