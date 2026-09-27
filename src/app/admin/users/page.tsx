import { Prisma, Role } from "@prisma/client";
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
import { requireEventManagerPage } from "@/modules/auth/admin-session";
import { hasRole } from "@/modules/auth/authorization";
import { labelOf, roleLabels } from "@/shared/labels";
import { formatPhone } from "@/shared/phone";

function nameSearch(q: string): Prisma.UserWhereInput | undefined {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  return {
    AND: tokens.map((token) => ({
      OR: [
        { firstName: { contains: token, mode: "insensitive" } },
        { lastName: { contains: token, mode: "insensitive" } },
        { username: { contains: token, mode: "insensitive" } }
      ]
    }))
  };
}

function shortName(name: string, max = 18) {
  const chars = Array.from(name.trim());
  if (chars.length <= max) return name;
  return `${chars.slice(0, max - 1).join("")}…`;
}

function primaryRole(roles: Array<{ role: Role }>) {
  if (roles.some((item) => item.role === Role.SUPER_ADMIN)) {
    return Role.SUPER_ADMIN;
  }
  if (roles.some((item) => item.role === Role.ADMIN)) {
    return Role.ADMIN;
  }
  return Role.USER;
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentAdmin = await requireEventManagerPage();
  const isSuperAdmin = hasRole(currentAdmin, Role.SUPER_ADMIN);
  const query = ((await searchParams).q ?? "").trim();
  const [users, specialBadges] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, ...nameSearch(query) },
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
        subtitle="اسم همراه را جستجو کن. تغییر نقش و نشان ویژه فقط برای سوپرادمین است."
      />
      <form action="/admin/users" className="mb-4 grid grid-cols-[1fr_auto] gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="جستجو با اسم"
          className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-sm text-white outline-none focus:border-[#F39C12]"
        />
        <Button type="submit" pendingLabel="…">
          جستجو
        </Button>
      </form>
      <details className="mb-4 rounded-xl border border-[#F39C12]/25 bg-[#2A160C] p-4">
        <summary className="cursor-pointer font-black text-white">
          نقش‌ها یعنی چه؟
        </summary>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          عضو فقط بخش‌های معمولی را می‌بیند. ادمین می‌تواند برنامه بسازد، وضعیت
          برنامه را تغییر دهد و حضور و غیاب را ثبت کند. سوپرادمین به همه چیز
          دسترسی دارد؛ از نقش کاربران تا نشان‌ها و ویرایش کامل.
        </p>
      </details>
      <div className="grid min-w-0 gap-3">
        {users.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-slate-300">
              {query ? "همراهی با این اسم پیدا نشد." : "هنوز عضوی ثبت نشده است."}
            </p>
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

            const phone = formatPhone(user.profile?.phoneNumber);

            return (
              <AdminCard key={user.id} className="min-w-0 max-w-full overflow-hidden p-0">
                <details className="min-w-0 max-w-full">
                  <summary className="block w-full max-w-full cursor-pointer list-none overflow-hidden px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex w-full min-w-0 max-w-full items-start gap-3">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h2 className="block max-w-full truncate font-black text-white" title={displayName}>
                          {shortName(displayName)}
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-400">
                          {labelOf(roleLabels, role)}
                          {" · "}
                          {user._count.attendance} حضور
                          {" · "}
                          {user.xp} امتیاز
                        </p>
                      </div>
                      <p
                        className="shrink-0 text-sm font-bold text-[#F39C12]"
                        dir={phone ? "ltr" : "rtl"}
                      >
                        {phone ?? "شماره ندارد"}
                      </p>
                    </div>
                  </summary>
                  <div className="grid gap-4 border-t border-white/10 px-4 py-4">
                    <p className="break-words text-sm font-bold text-white">{displayName}</p>
                    <p className="text-sm text-slate-400">
                      @{user.username ?? "بدون نام کاربری"}
                      {user.profile?.birthDate
                        ? ` · تولد ${formatJalaliPretty(user.profile.birthDate)}`
                        : ""}
                      {` · ${user._count.badges} نشان`}
                    </p>
                  {isSuperAdmin ? (
                    <UserRoleForm
                      key={`${user.id}-${role}`}
                      userId={user.id}
                      role={role}
                      disabled={isSelfSuperAdmin}
                      disabledHint="برای جلوگیری از قفل شدن پنل، نقش سوپرادمین خودت از اینجا تغییر نمی‌کند."
                    />
                  ) : (
                    <p className="text-sm text-slate-400">
                      برای تغییر نقش باید سوپرادمین باشی.
                    </p>
                  )}
                {isSuperAdmin ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
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
                ) : null}
                  </div>
                </details>
              </AdminCard>
            );
          })
        )}
      </div>
    </>
  );
}

