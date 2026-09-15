import { ExternalLink, Megaphone, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/user/empty-state";
import { UserCard, UserPageHeader } from "@/components/user/user-card";
import { UserPageShell } from "@/components/user/user-shell";
import { defaultCommunitySlug } from "@/lib/config";
import { APP_NAME } from "@/shared/brand";
import { prisma } from "@/lib/prisma";
import { getOptionalCurrentUser } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function CommunityResourcesPage() {
  const user = await getOptionalCurrentUser();
  const community = await prisma.community.findFirst({
    where: user
      ? { id: user.communityId }
      : { slug: defaultCommunitySlug, isActive: true }
  });

  const resources = community
    ? await prisma.telegramResource.findMany({
        where: { communityId: community.id, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      })
    : [];

  return (
    <UserPageShell>
      <UserPageHeader
        title="گروه و کانال"
        subtitle={`گروه‌ها و کانال‌های رسمی ${APP_NAME}.`}
        backFallbackHref="/me"
      />
      <div className="grid gap-3">
        {resources.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="هنوز گروهی ثبت نشده"
            description={`گروه و کانال رسمی ${APP_NAME} به‌زودی همین‌جا می‌آید.`}
          />
        ) : (
          resources.map((resource) => (
            <a
              key={resource.id}
              href={resource.link}
              target="_blank"
              rel="noreferrer"
              className="block cursor-pointer"
            >
              <UserCard className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
                  {resource.type === "CHANNEL" ? (
                    <Megaphone size={20} />
                  ) : (
                    <UsersRound size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-black text-white">{resource.name}</h2>
                    <ExternalLink size={16} className="text-ember" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-ember">
                    {resource.type === "CHANNEL" ? "کانال" : "گروه"}
                  </p>
                  {resource.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {resource.description}
                    </p>
                  ) : null}
                </div>
              </UserCard>
            </a>
          ))
        )}
      </div>
    </UserPageShell>
  );
}
