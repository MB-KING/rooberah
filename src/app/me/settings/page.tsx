import { ChevronDown, Eye, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { PersianDateField } from "@/components/admin/persian-date-field";
import { ProfileSettingsForm } from "@/components/user/profile-settings-form";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { cn } from "@/lib/cn";
import { tehranDateInputValue } from "@/lib/tehran-time";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserPage } from "@/modules/auth/session";
import {
  readSocialLinks,
  SOCIAL_LINK_FIELDS
} from "@/shared/social-links";
import { WORK_STATUS_OPTIONS } from "@/shared/work-status";

const fieldControlClass =
  "w-full rounded-xl border border-white/10 bg-ink px-3 text-start text-white outline-none focus:border-ember";
const fieldInputClass = cn(fieldControlClass, "h-11");

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await requireCurrentUserPage();
  const [profile, categories] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.workCategory.findMany({
      where: { communityId: user.communityId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const social = readSocialLinks(profile?.socialLinks);

  return (
    <UserPageShell width="narrow">
      <UserPageHeader
        title="تنظیمات پروفایل"
        subtitle="مشخص کن سایر اعضا چه اطلاعاتی از تو را ببینند."
      />
      <UserCard className="mb-4 border-ember/25 bg-pine">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-ember"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-black text-white">حریم خصوصی دست خود توست</h2>
            <p className="mt-1 text-sm leading-7 text-slate-300">
              تکمیل پروفایل اختیاری است؛ فقط چیزی را بنویس که مایل به نمایش آن
              هستی.
            </p>
          </div>
        </div>
      </UserCard>
      <UserCard>
        <ProfileSettingsForm>
          <Field label="نام">
            <input
              name="firstName"
              required
              maxLength={60}
              defaultValue={user.firstName ?? ""}
              className={fieldInputClass}
              placeholder="مثلاً سارا"
              autoComplete="given-name"
              dir="rtl"
            />
          </Field>
          <Field label="نام خانوادگی">
            <input
              name="lastName"
              required
              maxLength={60}
              defaultValue={user.lastName ?? ""}
              className={fieldInputClass}
              placeholder="مثلاً محمدی"
              autoComplete="family-name"
              dir="rtl"
            />
          </Field>
          <Field
            label="شماره تلفن"
            hint="فقط ادمین‌ها می‌بینند؛ در پروفایل عمومی نیست."
          >
            <input
              name="phone"
              maxLength={20}
              defaultValue={profile?.phoneNumber ?? ""}
              className={cn(fieldInputClass, "text-left")}
              placeholder="0912xxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
            />
          </Field>
          <PersianDateField
            name="birthDate"
            label="تاریخ تولد"
            optional
            defaultValue={
              profile?.birthDate ? tehranDateInputValue(profile.birthDate) : ""
            }
          />
          <Field label="درباره من">
            <textarea
              name="bio"
              maxLength={400}
              rows={4}
              defaultValue={profile?.bio ?? ""}
              className={cn(fieldControlClass, "min-h-28 py-3")}
              placeholder="علاقه‌مندی‌ها و مسیر حرفه‌ای کوتاه"
              dir="rtl"
            />
          </Field>
          <Field
            label="محل کار یا کسب‌وکار"
            hint="اختیاری است؛ محل کار فعلی‌ات، یا نام فروشگاه، استودیو و برند شخصی."
          >
            <input
              name="businessName"
              maxLength={120}
              defaultValue={profile?.businessName ?? ""}
              className={fieldInputClass}
              placeholder="مثلاً شرکت الف، کافه خودم یا استودیو طراحی"
              dir="rtl"
            />
          </Field>
          <Field label="حوزه کاری">
            <SelectControl
              name="workCategoryId"
              defaultValue={user.workCategoryId ?? ""}
            >
              <option value="">انتخاب نشده</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field label="وضعیت کاری">
            <SelectControl
              name="workStatus"
              defaultValue={profile?.workStatus ?? ""}
            >
              <option value="">انتخاب نشده</option>
              {WORK_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field label="مهارت‌ها">
            <input
              name="skills"
              maxLength={300}
              defaultValue={profile?.skills ?? ""}
              className={fieldInputClass}
              placeholder="مثلاً طراحی، فروش، برنامه‌نویسی"
              dir="rtl"
            />
          </Field>

          <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <h3 className="text-sm font-black text-white">لینک‌های من</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                هر کدام را که می‌خواهی دیگران ببینند پر کن؛ بقیه را خالی بگذار.
              </p>
            </div>
            {SOCIAL_LINK_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  name={field.key}
                  maxLength={200}
                  defaultValue={social[field.key] ?? ""}
                  className={cn(fieldInputClass, "text-left")}
                  placeholder={field.placeholder}
                  dir="ltr"
                  inputMode="url"
                  autoComplete="url"
                />
              </Field>
            ))}
          </div>

          <div className="grid gap-3">
            <Toggle
              name="showInMembersDirectory"
              label="نمایش من در فهرست همراهان"
              description="اگر خاموش باشد، پروفایل تو برای اعضای عادی نمایش داده نمی‌شود."
              defaultChecked={profile?.showInMembersDirectory ?? true}
            />
            <Toggle
              name="showTelegramUsername"
              label="نمایش نام کاربری تلگرام"
              description="اعضا بتوانند نام کاربری تلگرام تو را ببینند."
              defaultChecked={profile?.showTelegramUsername ?? true}
            />
            <Toggle
              name="showBusiness"
              label="نمایش محل کار یا کسب‌وکار"
              description="محل کار فعلی یا کسب‌وکاری که بالا نوشتی دیده شود."
              defaultChecked={profile?.showBusiness ?? true}
            />
            <Toggle
              name="showAttendanceCount"
              label="نمایش تعداد حضورها"
              description="تعداد حضورهای تأییدشده در پروفایل عمومی دیده شود."
              defaultChecked={profile?.showAttendanceCount ?? true}
            />
            <Toggle
              name="showWorkCategory"
              label="نمایش حوزه کاری"
              description="حوزه کاری در پروفایل عمومی دیده شود."
              defaultChecked={profile?.showWorkCategory ?? true}
            />
            <Toggle
              name="showWorkStatus"
              label="نمایش وضعیت کاری"
              description="وضعیت‌هایی مثل استخدام یا آماده کار تیمی دیده شود."
              defaultChecked={profile?.showWorkStatus ?? true}
            />
            <Toggle
              name="showSkills"
              label="نمایش مهارت‌ها"
              description="مهارت‌ها در پروفایل عمومی دیده شوند."
              defaultChecked={profile?.showSkills ?? true}
            />
            <Toggle
              name="showSocialLinks"
              label="نمایش لینک‌ها"
              description="وب‌سایت و لینکدین در پروفایل عمومی دیده شوند."
              defaultChecked={profile?.showSocialLinks ?? true}
            />
          </div>
        </ProfileSettingsForm>
      </UserCard>
    </UserPageShell>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      {children}
      {hint ? (
        <span className="text-xs font-medium leading-5 text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectControl({
  name,
  defaultValue,
  children
}: {
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        name={name}
        defaultValue={defaultValue}
        className={cn(fieldInputClass, "appearance-none pe-10")}
        dir="rtl"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </span>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 shrink-0 accent-ember"
      />
      <Eye
        size={18}
        className="mt-0.5 shrink-0 text-ember"
        aria-hidden="true"
      />
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {description}
        </span>
      </span>
    </label>
  );
}
