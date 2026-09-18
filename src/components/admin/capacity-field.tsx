"use client";

import { useState } from "react";

export function CapacityField({
  defaultCapacity
}: {
  defaultCapacity?: number | null;
}) {
  const [unlimited, setUnlimited] = useState(defaultCapacity == null);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-slate-200">ظرفیت</legend>
      <div className="grid grid-cols-2 gap-2">
        <ModeButton
          active={unlimited}
          onClick={() => setUnlimited(true)}
          label="نامحدود"
        />
        <ModeButton
          active={!unlimited}
          onClick={() => setUnlimited(false)}
          label="محدود"
        />
      </div>
      {unlimited ? (
        <>
          <input type="hidden" name="capacity" value="" />
          <p className="text-xs leading-6 text-slate-400">
            ثبت‌نام سقف ندارد. فقط برای برنامه‌های خاص محدودیت بگذار.
          </p>
        </>
      ) : (
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          حداکثر نفرات
          <input
            name="capacity"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={defaultCapacity ? String(defaultCapacity) : ""}
            placeholder="مثلا ۸۰"
            className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
          />
        </label>
      )}
    </fieldset>
  );
}

function ModeButton({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "h-11 cursor-pointer rounded-xl border border-[#F39C12] bg-[#F39C12]/15 text-sm font-black text-[#FDE68A]"
          : "h-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-slate-300"
      }
    >
      {label}
    </button>
  );
}
