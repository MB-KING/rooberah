"use client";

import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldClass =
  "h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-start text-sm font-medium text-white outline-none focus:border-ember";

export function MembersFilters({
  q,
  category,
  status,
  sort,
  categories,
  statusOptions
}: {
  q: string;
  category: string;
  status: string;
  sort: "recent" | "steps";
  categories: Array<{ id: string; name: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}) {
  function submitOnChange(event: React.ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      key={`${q}|${category}|${status}|${sort}`}
      action="/members"
      className="mb-4 grid gap-3"
      dir="rtl"
    >
      {sort === "steps" ? (
        <input type="hidden" name="sort" value="steps" />
      ) : null}

      <label className="grid gap-2 text-sm font-bold text-slate-200">
        جستجو
        <span className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder="نام، تخصص، کسب‌وکار، مهارت…"
            className={cn(fieldClass, "pr-10")}
            dir="rtl"
          />
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          تخصص
          <span className="relative block">
            <select
              name="category"
              defaultValue={category}
              onChange={submitOnChange}
              className={cn(fieldClass, "appearance-none pe-10")}
              dir="rtl"
            >
              <option value="">همه تخصص‌ها</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-200">
          وضعیت
          <span className="relative block">
            <select
              name="status"
              defaultValue={status}
              onChange={submitOnChange}
              className={cn(fieldClass, "appearance-none pe-10")}
              dir="rtl"
            >
              <option value="">هر وضعیت</option>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-ember text-sm font-black text-ink transition duration-200"
      >
        جستجو
      </button>
    </form>
  );
}
