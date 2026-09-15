import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import {
  APP_VERSION,
  changelog,
  formatAppVersion
} from "@/shared/app-version";
import { APP_NAME } from "@/shared/brand";

export default function ChangelogPage() {
  return (
    <UserPageShell>
      <UserPageHeader
        title="تغییرات"
        subtitle={`از شروع ${APP_NAME} تا نسخه ${formatAppVersion(APP_VERSION)}.`}
        backFallbackHref="/me"
      />
      <div className="grid gap-3">
        {changelog.map((release) => (
          <UserCard key={`${release.version}-${release.title}`}>
            <p className="text-[11px] font-bold text-slate-500">
              {release.dateLabel}
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="font-medium">
                {formatAppVersion(release.version)}
              </span>
            </p>
            <h2 className="mt-1.5 text-base font-black text-white">
              {release.title}
            </h2>
            <ul className="mt-3 grid gap-2">
              {release.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm leading-7 text-slate-300"
                >
                  <span
                    className="mt-3 h-1 w-1 shrink-0 rounded-full bg-slate-500"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </UserCard>
        ))}
      </div>
    </UserPageShell>
  );
}
