"use client";

import { useEffect, useRef, useState } from "react";
import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import "react-multi-date-picker/styles/colors/yellow.css";

function persianValue(iso: string) {
  if (!iso) return undefined;
  return new DateObject({
    calendar: gregorian,
    format: "YYYY-MM-DD",
    date: iso
  }).convert(persian, persian_fa);
}

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
  const [iso, setIso] = useState(defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    inputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    inputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [iso]);

  function onChange(date: DateObject | null) {
    if (!date) {
      setIso("");
      return;
    }
    setIso(new DateObject(date).convert(gregorian).format("YYYY-MM-DD"));
  }

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <DatePicker
        value={persianValue(iso)}
        onChange={onChange}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-right"
        portal
        required={required}
        className="bg-dark yellow"
        containerClassName="w-full"
        inputClass="h-11 w-full rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
      <input ref={inputRef} type="hidden" name={name} value={iso} required={required} />
      {optional ? (
        <button
          type="button"
          onClick={() => setIso("")}
          className="justify-self-start text-xs font-bold text-slate-400"
        >
          پاک کردن تاریخ
        </button>
      ) : null}
    </label>
  );
}
