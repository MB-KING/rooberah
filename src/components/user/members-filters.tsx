"use client";

import { ChevronDown, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { secondaryActionClass } from "@/components/user/user-action-styles";
import { cn } from "@/lib/cn";

const fieldClass =
  "h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-start text-sm font-medium text-white outline-none focus:border-ember";

function membersHref(input: { q: string; category: string; status: string }) {
  const params = new URLSearchParams();
  if (input.q.trim()) params.set("q", input.q.trim());
  if (input.category) params.set("category", input.category);
  if (input.status) params.set("status", input.status);
  const query = params.toString();
  return (query ? `/members?${query}` : "/members") as Route;
}

export function MembersFilters({
  q,
  category,
  status,
  categories,
  statusOptions
}: {
  q: string;
  category: string;
  status: string;
  categories: Array<{ id: string; name: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const searchTimer = useRef<number | null>(null);
  const hasFilter = Boolean(q || category || status);

  function apply(next: { q?: string; category?: string; status?: string }) {
    router.replace(
      membersHref({
        q: next.q ?? q,
        category: next.category ?? category,
        status: next.status ?? status
      })
    );
  }

  return (
    <div className="mb-4 grid gap-3" dir="rtl">
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
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (searchTimer.current) window.clearTimeout(searchTimer.current);
              searchTimer.current = window.setTimeout(() => {
                apply({ q: value });
              }, 250);
            }}
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
              onChange={(event) => apply({ category: event.currentTarget.value })}
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
              onChange={(event) => apply({ status: event.currentTarget.value })}
              className={cn(fieldClass, "appearance-none pe-10")}
              dir="rtl"
            >
              <option value="">همه وضعیت‌ها</option>
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

      {hasFilter ? (
        <Link href={"/members" as Route} className={secondaryActionClass}>
          پاک کردن فیلتر
        </Link>
      ) : null}
    </div>
  );
}
