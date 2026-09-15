"use client";

import { Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setUserRoleAction } from "@/app/admin/actions";
import { labelOf, roleLabels } from "@/shared/labels";

const editableRoles = [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] as const;

export function UserRoleForm({
  userId,
  role,
  disabled = false,
  disabledHint
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [savedRole, setSavedRole] = useState(role);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl bg-white/10 p-3"
      action={(formData) => {
        startTransition(async () => {
          setMessage(null);
          await setUserRoleAction(formData);
          const nextRole = zRole(formData.get("role"));
          setSavedRole(nextRole);
          setSelectedRole(nextRole);
          setMessage("نقش ذخیره شد.");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <label className="grid gap-2 text-sm font-bold text-slate-200">
        نقش کاربر
        <select
          name="role"
          value={selectedRole}
          disabled={disabled || pending}
          onChange={(event) => {
            setSelectedRole(event.target.value as Role);
            setMessage(null);
          }}
          className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
        >
          {editableRoles.map((item) => (
            <option key={item} value={item}>
              {labelOf(roleLabels, item)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs font-bold text-[#F39C12]">
        نقش فعلی: {labelOf(roleLabels, savedRole)}
      </p>
      <button
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F39C12] px-3 text-sm font-black text-[#1C1008] disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            در حال ذخیره…
          </>
        ) : (
          "ذخیره نقش"
        )}
      </button>
      {message ? (
        <p className="text-xs font-bold text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      {disabled && disabledHint ? (
        <p className="text-xs leading-6 text-slate-400">{disabledHint}</p>
      ) : null}
    </form>
  );
}

function zRole(value: FormDataEntryValue | null): Role {
  if (
    value === Role.USER ||
    value === Role.ADMIN ||
    value === Role.SUPER_ADMIN
  ) {
    return value;
  }
  return Role.USER;
}
