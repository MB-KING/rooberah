import { Eye, Save, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserPage } from "@/modules/auth/session";
import {
  readSocialLinks,
  SOCIAL_LINK_FIELDS
} from "@/shared/social-links";
import { WORK_STATUS_OPTIONS } from "@/shared/work-status";

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
        <form action={updateProfileAction} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              نام
              <input
                name="firstName"
                required
                maxLength={60}
                defaultValue={user.firstName ?? ""}
                className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white outline-none focus:border-ember"
                placeholder="مثلاً سارا"
                autoComplete="given-name"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-200">
              نام خانوادگی
              <input
                name="lastName"
                required
                maxLength={60}
                defaultValue={user.lastName ?? ""}
                className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white outline-none focus:border-ember"
                placeholder="مثلاً محمدی"
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            درباره من
            <textarea
              name="bio"
              maxLength={400}
              rows={4}
              defaultValue={profile?.bio ?? ""}
              className="rounded-xl border border-white/10 bg-ink px-3 py-3 text-white outline-none focus:border-ember"
              placeholder="علاقه‌مندی‌ها و مسیر حرفه‌ای کوتاه"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            کسب‌وکار
            <input
              name="businessName"
              maxLength={120}
              defaultValue={profile?.businessName ?? ""}
              className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white outline-none focus:border-ember"
              placeholder="اگر کسب‌وکاری داری، همین‌جا بنویس"
            />
            <span className="text-xs font-medium text-slate-400">
              اختیاری است؛ مثلاً نام فروشگاه، استودیو یا برند شخصی.
            </span>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            حوزه کاری
            <select
              name="workCategoryId"
              defaultValue={user.workCategoryId ?? ""}
              className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white"
            >
              <option value="">انتخاب نشده</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            وضعیت کاری
            <select
              name="workStatus"
              defaultValue={profile?.workStatus ?? ""}
              className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white"
            >
              <option value="">انتخاب نشده</option>
              {WORK_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            مهارت‌ها
            <input
              name="skills"
              maxLength={300}
              defaultValue={profile?.skills ?? ""}
              className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white"
              placeholder="مثلاً طراحی، فروش، برنامه‌نویسی"
            />
          </label>

          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <h3 className="text-sm font-black text-white">لینک‌های من</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                هر کدام را که می‌خواهی دیگران ببینند پر کن؛ بقیه را خالی بگذار.
              </p>
            </div>
            {SOCIAL_LINK_FIELDS.map((field) => (
              <label
                key={field.key}
                className="grid gap-2 text-sm font-bold text-slate-200"
              >
                {field.label}
                <input
                  name={field.key}
                  maxLength={200}
                  defaultValue={social[field.key] ?? ""}
                  className="h-11 rounded-xl border border-white/10 bg-ink px-3 text-white outline-none focus:border-ember"
                  placeholder={field.placeholder}
                  dir="ltr"
                  inputMode="url"
                  autoComplete="url"
                />
              </label>
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
              label="نمایش کسب‌وکار"
              description="نام کسب‌وکاری که بالا نوشتی در پروفایل عمومی دیده شود."
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
              description="وضعیت کاری مثل استخدام یا آماده کار تیمی دیده شود."
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
          <Button
            type="submit"
            className="w-full"
            pendingLabel="در حال ذخیره…"
          >
            <Save size={18} aria-hidden="true" />
            ذخیره تنظیمات
          </Button>
        </form>
      </UserCard>
    </UserPageShell>
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
