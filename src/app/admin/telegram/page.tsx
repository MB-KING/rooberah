import {
  deleteTelegramResourceAction,
  updateMembershipGateAction,
  upsertTelegramResourceAction
} from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";

export default async function AdminTelegramPage() {
  const admin = await requireSuperAdminPage();
  const [community, resources] = await Promise.all([
    prisma.community.findUnique({
      where: { id: admin.communityId },
      select: { requireTelegramMembership: true }
    }),
    prisma.telegramResource.findMany({
      where: { communityId: admin.communityId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    })
  ]);

  return (
    <>
      <PageTitle
        title="گروه و کانال تلگرام"
        subtitle="منابع رسمی و تنظیم اعلان انتشار برنامه."
      />
      <AdminCard className="mb-5">
        <h2 className="mb-2 font-black text-white">عضویت اجباری</h2>
        <p className="mb-3 text-xs leading-6 text-slate-400">
          اگر روشن باشد، کسی که عضو کانال و گروه‌های اجباری نباشد نمی‌تواند در
          برنامه‌ها ثبت‌نام کند و در صفحه خانه هشدار می‌بیند. ربات باید ادمین
          همان چت باشد و Chat ID پر شده باشد.
        </p>
        <form action={updateMembershipGateAction} className="grid gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="requireTelegramMembership"
              type="checkbox"
              defaultChecked={community?.requireTelegramMembership ?? false}
              className="h-4 w-4 accent-[#F39C12]"
            />
            حضور در کانال و گروه برای ثبت‌نام اجباری باشد
          </label>
          <Button type="submit" className="w-full" pendingLabel="در حال ذخیره…">
            ذخیره این تنظیم
          </Button>
        </form>
      </AdminCard>
      <AdminCard className="mb-5">
        <h2 className="mb-3 font-black text-white">افزودن منبع</h2>
        <form action={upsertTelegramResourceAction} className="grid gap-3">
          <Field name="name" label="نام" required />
          <Field name="description" label="توضیح" />
          <Field name="link" label="لینک تلگرام" placeholder="https://t.me/..." required />
          <label className="grid gap-1 text-sm font-bold text-slate-200">
            نوع
            <select
              name="type"
              className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white"
              defaultValue="GROUP"
            >
              <option value="GROUP">گروه</option>
              <option value="CHANNEL">کانال</option>
            </select>
          </label>
          <Field name="telegramChatId" label="Chat ID (اختیاری)" placeholder="-100..." />
          <Field name="sortOrder" label="ترتیب" type="number" defaultValue="0" />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input name="isActive" type="checkbox" defaultChecked className="accent-[#F39C12]" />
            فعال
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="receiveAnnouncements"
              type="checkbox"
              defaultChecked
              className="accent-[#F39C12]"
            />
            دریافت اعلان برنامه جدید
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input
              name="requiredForAccess"
              type="checkbox"
              defaultChecked
              className="accent-[#F39C12]"
            />
            عضویت برای ثبت‌نام لازم است
          </label>
          <p className="text-xs leading-6 text-slate-400">
            برای ارسال خودکار، Chat ID را پر کن (مثلاً از /addgroup داخل گروه) و
            مطمئن شو ربات ادمین گروه است.
          </p>
          <Button type="submit" className="w-full" pendingLabel="در حال ذخیره…">
            ذخیره
          </Button>
        </form>
      </AdminCard>
      <div className="grid gap-3">
        {resources.map((resource) => (
          <AdminCard key={resource.id}>
            <form action={upsertTelegramResourceAction} className="grid gap-3">
              <input type="hidden" name="id" value={resource.id} />
              <Field name="name" label="نام" defaultValue={resource.name} required />
              <Field
                name="description"
                label="توضیح"
                defaultValue={resource.description ?? ""}
              />
              <Field name="link" label="لینک" defaultValue={resource.link} required />
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                نوع
                <select
                  name="type"
                  defaultValue={resource.type}
                  className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white"
                >
                  <option value="GROUP">گروه</option>
                  <option value="CHANNEL">کانال</option>
                </select>
              </label>
              <Field
                name="telegramChatId"
                label="Chat ID"
                defaultValue={
                  resource.telegramChatId != null
                    ? resource.telegramChatId.toString()
                    : ""
                }
              />
              <Field
                name="sortOrder"
                label="ترتیب"
                type="number"
                defaultValue={String(resource.sortOrder)}
              />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={resource.isActive}
                  className="accent-[#F39C12]"
                />
                فعال
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  name="receiveAnnouncements"
                  type="checkbox"
                  defaultChecked={resource.receiveAnnouncements}
                  className="accent-[#F39C12]"
                />
                دریافت اعلان
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  name="requiredForAccess"
                  type="checkbox"
                  defaultChecked={resource.requiredForAccess}
                  className="accent-[#F39C12]"
                />
                عضویت برای ثبت‌نام لازم است
              </label>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="w-full flex-1 bg-white/10 text-white shadow-none hover:bg-white/15"
                  pendingLabel="در حال ذخیره…"
                >
                  به‌روزرسانی
                </Button>
              </div>
            </form>
            <form action={deleteTelegramResourceAction} className="mt-2">
              <input type="hidden" name="id" value={resource.id} />
              <PendingSubmitButton
                className="w-full border border-red-400/30 text-sm font-bold text-red-200"
                pendingLabel="در حال غیرفعال‌سازی…"
              >
                غیرفعال‌سازی
              </PendingSubmitButton>
            </form>
          </AdminCard>
        ))}
      </div>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white"
      />
    </label>
  );
}
