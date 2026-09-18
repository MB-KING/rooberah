import { Role } from "@prisma/client";
import {
  assignSpecialBadgeAction,
  revokeSpecialBadgeAction
} from "@/app/admin/actions";
import { AdminCard, PageTitle } from "@/components/admin/admin-card";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { Button } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { formatJalaliPretty } from "@/lib/jalali";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/modules/auth/admin-session";
import { hasRole } from "@/modules/auth/authorization";
import { formatPhone } from "@/shared/phone";

function primaryRole(roles: Array<{ role: Role }>) {
  if (roles.some((item) => item.role === Role.SUPER_ADMIN)) {
    return Role.SUPER_ADMIN;
  }
  if (roles.some((item) => item.role === Role.ADMIN)) {
    return Role.ADMIN;
  }
  return Role.USER;
}

export default async function AdminUsersPage() {
  const currentAdmin = await requireSuperAdminPage();
  const [users, specialBadges] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { joinedAt: "desc" },
      include: {
        profile: { select: { phoneNumber: true, birthDate: true } },
        roles: true,
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
            attendance: { where: { status: "PRESENT" } },
            badges: true,
            redemptions: true
          }
        }
      }
    }),
    prisma.badge.findMany({
      where: {
        communityId: currentAdmin.communityId,
        type: "SPECIAL",
        isActive: true
      },
      orderBy: { sortOrder: "asc" }
    })
  ]);

  return (
    <>
      <PageTitle
        title="اعضا و نقش‌ها"
        subtitle="برای هر کاربر فقط یکی از سه نقش اصلی را انتخاب کن: عضو، ادمین یا سوپرادمین."
      />
      <AdminCard className="mb-4 border-[#F39C12]/25 bg-[#2A160C]">
        <h2 className="font-black text-white">نقش‌ها یعنی چه؟</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          عضو فقط بخش‌های معمولی را می‌بیند. ادمین می‌تواند برنامه بسازد، وضعیت
          برنامه را تغییر دهد و حضور و غیاب را ثبت کند. سوپرادمین به همه چیز
          دسترسی دارد؛ از نقش کاربران تا نشان‌ها و ویرایش کامل.
        </p>
      </AdminCard>
      <div className="grid gap-3">
        {users.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-slate-300">هنوز عضوی ثبت نشده است.</p>
          </AdminCard>
        ) : (
          users.map((user) => {
            const displayName =
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.username ||
              user.telegramId.toString();
            const role = primaryRole(user.roles);
            const isSelfSuperAdmin =
              currentAdmin.id === user.id && hasRole(user, Role.SUPER_ADMIN);

            return (
              <AdminCard key={user.id}>
                <div className="grid gap-4">
                  <div>
                    <h2 className="font-black text-white">{displayName}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      @{user.username ?? "بدون نام کاربری"}
                    </p>
                    {user.profile?.phoneNumber ? (
                      <p className="mt-2 text-sm font-bold text-[#F39C12]" dir="ltr">
                        {formatPhone(user.profile.phoneNumber)}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">شماره تلفن ندارد.</p>
                    )}
                    {user.profile?.birthDate ? (
                      <p className="mt-1 text-xs font-bold text-slate-300">
                        تولد {formatJalaliPretty(user.profile.birthDate)}
                      </p>
                    ) : null}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
                      <Metric label="امتیاز" value={user.xp} />
                      <Metric label="حضور" value={user._count.attendance} />
                      <Metric label="نشان" value={user._count.badges} />
                    </div>
                  </div>

                  <UserRoleForm
                    key={`${user.id}-${role}`}
                    userId={user.id}
                    role={role}
                    disabled={isSelfSuperAdmin}
                    disabledHint="برای جلوگیری از قفل شدن پنل، نقش سوپرادمین خودت از اینجا تغییر نمی‌کند."
                  />
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-sm font-bold text-white">نشان‌های ویژه</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.badges.filter((item) => item.badge.type === "SPECIAL")
                      .length === 0 ? (
                      <span className="text-xs text-slate-500">
                        نشان ویژه‌ای ندارد.
                      </span>
                    ) : (
                      user.badges
                        .filter((item) => item.badge.type === "SPECIAL")
                        .map((item) => (
                          <form
                            key={item.id}
                            action={revokeSpecialBadgeAction}
                            className="inline-flex items-center gap-2 rounded-full bg-[#F39C12]/15 px-3 py-1 text-xs font-bold text-[#F39C12]"
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <input
                              type="hidden"
                              name="badgeId"
                              value={item.badgeId}
                            />
                            <span>{item.badge.name}</span>
                            <PendingSubmitButton
                              title="پس گرفتن نشان"
                              className="min-h-8 px-1 text-red-300 shadow-none"
                              pendingLabel="…"
                            >
                              ×
                            </PendingSubmitButton>
                          </form>
                        ))
                    )}
                  </div>
                  {specialBadges.length > 0 ? (
                    <form
                      action={assignSpecialBadgeAction}
                      className="mt-3 grid gap-2"
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="badgeId"
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#1C1008] px-3 text-sm text-white"
                      >
                        {specialBadges.map((badge) => (
                          <option key={badge.id} value={badge.id}>
                            {badge.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        className="w-full"
                        pendingLabel="…"
                      >
                        اختصاص نشان
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      برای اختصاص دستی، ابتدا یک نشان از نوع «ویژه» بساز.
                    </p>
                  )}
                </div>
              </AdminCard>
            );
          })
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1">{label}</p>
    </div>
  );
}
