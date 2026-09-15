"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatJalaliDisplay,
  gregorianIsoFromJalali,
  jalaliFromGregorianIso,
  jalaliMonthLength,
  jalaliMonthNames,
  jalaliWeekdayIndex,
  jalaliWeekdayNames,
  todayJalali,
  type JalaliDate
} from "@/lib/jalali";

export function PersianDateField({
  name = "date",
  label = "تاریخ برگزاری",
  required,
  defaultValue
}: {
  name?: string;
  label?: string;
  required?: boolean;
  /** Gregorian ISO YYYY-MM-DD */
  defaultValue?: string;
}) {
  const initial =
    (defaultValue && jalaliFromGregorianIso(defaultValue)) || todayJalali();
  const [selected, setSelected] = useState<JalaliDate>(initial);
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    const length = jalaliMonthLength(view.jy, view.jm);
    const offset = jalaliWeekdayIndex({ jy: view.jy, jm: view.jm, jd: 1 });
    const cells: Array<JalaliDate | null> = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let jd = 1; jd <= length; jd += 1) {
      cells.push({ jy: view.jy, jm: view.jm, jd });
    }
    return cells;
  }, [view.jy, view.jm]);

  const gregorianValue = gregorianIsoFromJalali(selected);

  function shiftMonth(delta: number) {
    let { jy, jm } = view;
    jm += delta;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setView({ jy, jm });
  }

  return (
    <div className="grid gap-2 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <input type="hidden" name={name} value={gregorianValue} required={required} />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 items-center justify-between rounded-xl border border-white/10 bg-[#1C1008] px-3 text-right text-white outline-none focus:border-[#F39C12]"
      >
        <span>{formatJalaliDisplay(selected)}</span>
        <span className="text-xs font-bold text-[#F39C12]">شمسی</span>
      </button>
      {open ? (
        <div className="rounded-xl border border-white/10 bg-[#1C1008] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"
              aria-label="ماه بعد"
            >
              <ChevronRight size={16} />
            </button>
            <p className="text-sm font-black text-white">
              {jalaliMonthNames[view.jm - 1]} {view.jy.toLocaleString("fa-IR")}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"
              aria-label="ماه قبل"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
            {jalaliWeekdayNames.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} />;
              }
              const active =
                day.jy === selected.jy &&
                day.jm === selected.jm &&
                day.jd === selected.jd;
              return (
                <button
                  key={`${day.jy}-${day.jm}-${day.jd}`}
                  type="button"
                  onClick={() => {
                    setSelected(day);
                    setOpen(false);
                  }}
                  className={`inline-flex h-9 items-center justify-center rounded-lg text-sm font-bold ${
                    active
                      ? "bg-[#F39C12] text-[#1C1008]"
                      : "bg-white/[0.04] text-white hover:bg-white/10"
                  }`}
                >
                  {day.jd.toLocaleString("fa-IR")}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
