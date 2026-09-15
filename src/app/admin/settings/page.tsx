import { Save, Settings } from "lucide-react";
import {
  updateCommunityAction,
  upsertStepRuleAction
} from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";
import {
  defaultStepRules,
  earnStepTypes,
  stepTypeLabels
} from "@/shared/steps";

export default async function AdminSettingsPage() {
  const admin = await requireSuperAdminPage();
  const [community, stepRules] = await Promise.all([
    prisma.community.findUnique({ where: { id: admin.communityId } }),
    prisma.stepRule.findMany({ where: { communityId: admin.communityId } })
  ]);
  if (!community) return null;
  const ruleMap = new Map(stepRules.map((rule) => [rule.type, rule.amount]));

  return (
    <>
      <PageTitle
        title="تنظیمات جامعه"
        subtitle="نام جامعه، جدول امتیاز و اعلان‌ها را مدیریت کن."
      />
      <AdminCard className="mb-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="text-[#F39C12]" size={20} />
          <h2 className="font-black text-white">مشخصات جامعه</h2>
        </div>
        <form action={updateCommunityAction} className="grid gap-4">
          <Field
            name="name"
            label="نام جامعه"
            defaultValue={community.name}
            required
          />
          <Field
            name="tagline"
            label="شعار کوتاه"
            defaultValue={community.tagline ?? ""}
          />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={community.isActive}
              className="h-4 w-4 accent-[#F39C12]"
            />
            جامعه فعال باشد
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="leaderboardEnabled"
              type="checkbox"
              defaultChecked={community.leaderboardEnabled}
              className="h-4 w-4 accent-[#F39C12]"
            />
            جدول امتیاز فعال باشد
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="autoAnnounceEnabled"
              type="checkbox"
              defaultChecked={community.autoAnnounceEnabled}
              className="h-4 w-4 accent-[#F39C12]"
            />
            اعلان خودکار برنامه در گروه‌های تلگرام
          </label>
          <div>
            <Button type="submit" className="w-full" pendingLabel="در حال ذخیره…">
              <Save size={17} />
              ذخیره تنظیمات
            </Button>
          </div>
        </form>
      </AdminCard>

      <AdminCard className="mb-5">
        <h2 className="mb-3 font-black text-white">قوانین امتیاز</h2>
        <div className="grid gap-3">
          {earnStepTypes.map((type) => (
            <form
              key={type}
              action={upsertStepRuleAction}
              className="flex flex-wrap items-end gap-2 rounded-xl bg-white/[0.04] p-3"
            >
              <input type="hidden" name="type" value={type} />
              <label className="grid min-w-[10rem] flex-1 gap-1 text-sm font-bold text-slate-200">
                {stepTypeLabels[type]}
                <input
                  name="amount"
                  type="number"
                  min={0}
                  defaultValue={String(
                    ruleMap.get(type) ?? defaultStepRules[type] ?? 0
                  )}
                  className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white"
                />
              </label>
              <PendingSubmitButton
                className="w-full bg-white/10 px-4 text-sm font-bold text-white"
                pendingLabel="…"
              >
                ذخیره
              </PendingSubmitButton>
            </form>
          ))}
        </div>
      </AdminCard>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  placeholder
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
    </label>
  );
}
