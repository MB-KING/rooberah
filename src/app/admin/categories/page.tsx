import { upsertWorkCategoryAction } from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";

export default async function AdminCategoriesPage() {
  const admin = await requireSuperAdminPage();
  const categories = await prisma.workCategory.findMany({
    where: { communityId: admin.communityId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <>
      <PageTitle
        title="حوزه‌های کاری"
        subtitle="دسته‌بندی‌های قابل‌مدیریت برای پروفایل و فیلتر همراهان."
      />
      <AdminCard className="mb-5">
        <h2 className="mb-3 font-black text-white">افزودن دسته</h2>
        <form action={upsertWorkCategoryAction} className="grid gap-3">
          <Field name="name" label="نام" required />
          <Field name="slug" label="اسلاگ انگلیسی" placeholder="tech" required />
          <Field name="sortOrder" label="ترتیب" type="number" defaultValue="0" />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <input name="isActive" type="checkbox" defaultChecked className="accent-[#F39C12]" />
            فعال
          </label>
          <Button type="submit" className="w-full" pendingLabel="در حال ذخیره…">
            ذخیره
          </Button>
        </form>
      </AdminCard>
      <div className="grid gap-3">
        {categories.map((category) => (
          <AdminCard key={category.id}>
            <form action={upsertWorkCategoryAction} className="grid gap-3">
              <input type="hidden" name="id" value={category.id} />
              <Field name="name" label="نام" defaultValue={category.name} required />
              <Field name="slug" label="اسلاگ" defaultValue={category.slug} required />
              <Field
                name="sortOrder"
                label="ترتیب"
                type="number"
                defaultValue={String(category.sortOrder)}
              />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={category.isActive}
                  className="accent-[#F39C12]"
                />
                فعال
              </label>
              <Button
                type="submit"
                className="w-full bg-white/10 text-white shadow-none hover:bg-white/15"
                pendingLabel="در حال ذخیره…"
              >
                به‌روزرسانی
              </Button>
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
