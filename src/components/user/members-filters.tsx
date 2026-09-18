"use client";

import { ChevronDown, ListFilter, Search, Trophy } from "lucide-react";
import { useState } from "react";
import {
  primaryActionClass,
  secondaryActionClass
} from "@/components/user/user-action-styles";
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
  const [open, setOpen] = useState(false);
  const [sortValue, setSortValue] = useState(sort);

  const categoryLabel = categories.find((item) => item.id === category)?.name;
  const statusLabel = statusOptions.find((item) => item.value === status)?.label;
  const summary = [
    sort === "steps" ? "بیشترین امتیاز" : null,
    q || null,
    categoryLabel,
    statusLabel
  ].filter((item): item is string => Boolean(item));
  const activeCount = summary.length;

  return (
    <div className="mb-4" dir="rtl">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="members-filters-panel"
        onClick={() => {
          setSortValue(sort);
          setOpen((current) => !current);
        }}
        className={secondaryActionClass}
      >
        <ListFilter size={16} aria-hidden="true" />
        فیلتر
        {activeCount > 0 ? (
          <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-black text-ink">
            {activeCount.toLocaleString("fa-IR")}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          className={cn(
            "ms-auto text-slate-400 transition duration-200",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>
      {summary.length > 0 && !open ? (
        <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
          {summary.join(" · ")}
        </p>
      ) : null}

      {open ? (
        <form
          id="members-filters-panel"
          action="/members"
          className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-pine/60 p-3"
          dir="rtl"
        >
          {sortValue === "steps" ? (
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

          <label className="grid gap-2 text-sm font-bold text-slate-200">
            تخصص
            <span className="relative block">
              <select
                name="category"
                defaultValue={category}
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

          <div className="grid gap-2">
            <p className="text-sm font-bold text-slate-200">مرتب‌سازی</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSortValue("recent")}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-bold transition duration-200",
                  sortValue === "recent"
                    ? "bg-ember text-ink"
                    : "bg-white/10 text-slate-200"
                )}
              >
                تازه‌ها
              </button>
              <button
                type="button"
                onClick={() => setSortValue("steps")}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition duration-200",
                  sortValue === "steps"
                    ? "bg-ember text-ink"
                    : "bg-white/10 text-slate-200"
                )}
              >
                <Trophy size={15} aria-hidden="true" />
                بیشترین امتیاز
              </button>
            </div>
          </div>

          <button type="submit" className={primaryActionClass}>
            اعمال فیلتر
          </button>
          {activeCount > 0 ? (
            <a href="/members" className={secondaryActionClass}>
              پاک کردن فیلتر
            </a>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
