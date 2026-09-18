"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatFaNumber,
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

type PickerMode = "days" | "months" | "years";

const cellClass =
  "inline-flex h-10 items-center justify-center rounded-lg text-sm font-bold";

export function PersianDateField({
  name = "date",
  label = "تاریخ برگزاری",
  required,
  optional,
  defaultValue
}: {
  name?: string;
  label?: string;
  required?: boolean;
  optional?: boolean;
  /** Gregorian ISO YYYY-MM-DD */
  defaultValue?: string;
}) {
  const initial = defaultValue ? jalaliFromGregorianIso(defaultValue) : null;
  const fallback = todayJalali();
  const [selected, setSelected] = useState<JalaliDate | null>(
    optional ? initial : initial ?? fallback
  );
  const [view, setView] = useState({
    jy: initial?.jy ?? fallback.jy,
    jm: initial?.jm ?? fallback.jm
  });
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("days");
  const inputRef = useRef<HTMLInputElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const start = 1300;
    const end = fallback.jy + 10;
    return Array.from({ length: end - start + 1 }, (_, index) => end - index);
  }, [fallback.jy]);

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

  const gregorianValue = selected ? gregorianIsoFromJalali(selected) : "";
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    inputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [gregorianValue]);

  useEffect(() => {
    if (mode !== "years") return;
    const active = yearListRef.current?.querySelector("[data-active=true]");
    active?.scrollIntoView({ block: "center" });
  }, [mode, view.jy]);

  function pick(day: JalaliDate | null) {
    setSelected(day);
    setOpen(false);
    setMode("days");
  }

  return (
    <div className="grid gap-2 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <input
        ref={inputRef}
        type="hidden"
        name={name}
        value={gregorianValue}
        required={required && !optional}
      />
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setMode("days");
        }}
        className="flex h-11 items-center justify-between rounded-xl border border-white/10 bg-[#1C1008] px-3 text-right text-white outline-none focus:border-[#F39C12]"
      >
        <span>
          {selected ? formatJalaliDisplay(selected) : "انتخاب نشده"}
        </span>
        <span className="text-xs font-bold text-[#F39C12]">شمسی</span>
      </button>
      {open ? (
        <div className="rounded-xl border border-white/10 bg-[#1C1008] p-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setMode((current) => (current === "months" ? "days" : "months"))
              }
              className={`${cellClass} bg-white/10 text-white ${
                mode === "months" ? "ring-1 ring-[#F39C12]" : ""
              }`}
            >
              {jalaliMonthNames[view.jm - 1]}
            </button>
            <button
              type="button"
              onClick={() =>
                setMode((current) => (current === "years" ? "days" : "years"))
              }
              className={`${cellClass} bg-white/10 text-white ${
                mode === "years" ? "ring-1 ring-[#F39C12]" : ""
              }`}
            >
              {formatFaNumber(view.jy)}
            </button>
          </div>
          {mode === "months" ? (
            <div className="grid grid-cols-3 gap-2">
              {jalaliMonthNames.map((month, index) => {
                const monthNumber = index + 1;
                const active = view.jm === monthNumber;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setView((current) => ({ ...current, jm: monthNumber }));
                      setMode("days");
                    }}
                    className={`${cellClass} ${
                      active
                        ? "bg-[#F39C12] text-[#1C1008]"
                        : "bg-white/[0.06] text-white"
                    }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          ) : null}
          {mode === "years" ? (
            <div
              ref={yearListRef}
              className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto"
            >
              {years.map((year) => {
                const active = view.jy === year;
                return (
                  <button
                    key={year}
                    type="button"
                    data-active={active || undefined}
                    onClick={() => {
                      setView((current) => ({ ...current, jy: year }));
                      setMode("days");
                    }}
                    className={`${cellClass} ${
                      active
                        ? "bg-[#F39C12] text-[#1C1008]"
                        : "bg-white/[0.06] text-white"
                    }`}
                  >
                    {formatFaNumber(year)}
                  </button>
                );
              })}
            </div>
          ) : null}
          {mode === "days" ? (
            <>
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
                    selected?.jy === day.jy &&
                    selected?.jm === day.jm &&
                    selected?.jd === day.jd;
                  return (
                    <button
                      key={`${day.jy}-${day.jm}-${day.jd}`}
                      type="button"
                      onClick={() => pick(day)}
                      className={`${cellClass} h-9 ${
                        active
                          ? "bg-[#F39C12] text-[#1C1008]"
                          : "bg-white/[0.04] text-white hover:bg-white/10"
                      }`}
                    >
                      {formatFaNumber(day.jd)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          {optional ? (
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-bold text-slate-300"
            >
              پاک کردن تاریخ
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
