"use client";

import { useState } from "react";
import DateObject from "react-date-object";
import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import "react-multi-date-picker/styles/colors/yellow.css";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function timeValue(hhmm: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return undefined;
  return new DateObject({ calendar: persian, locale: persian_fa }).set({
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: 0
  });
}

export function PersianTimeField({
  name = "startTime",
  label = "زمان شروع مسیر",
  required,
  defaultValue
}: {
  name?: string;
  label?: string;
  required?: boolean;
  /** 24-hour HH:mm */
  defaultValue?: string;
}) {
  const [time, setTime] = useState(defaultValue ?? "");

  function onChange(date: DateObject | null) {
    if (!date) {
      setTime("");
      return;
    }
    const value = new DateObject(date);
    setTime(`${pad(value.hour)}:${pad(value.minute)}`);
  }

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <DatePicker
        disableDayPicker
        format="HH:mm"
        value={timeValue(time)}
        onChange={onChange}
        calendar={persian}
        locale={persian_fa}
        plugins={[<TimePicker key="time" hideSeconds position="bottom" />]}
        portal
        className="bg-dark yellow"
        containerClassName="w-full"
        inputClass="h-11 w-full rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      />
      <input type="hidden" name={name} value={time} required={required} />
    </label>
  );
}
