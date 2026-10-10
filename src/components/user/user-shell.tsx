import { cn } from "@/lib/cn";
import { miniAppWidthClass } from "@/components/user/mini-app";
import { ProfileCompletePrompt } from "@/components/user/profile-complete-prompt";
import { UserNav } from "@/components/user/user-nav";
import { getOptionalCurrentUser } from "@/modules/auth/session";

export { miniAppWidthClass };
export {
  primaryActionClass,
  secondaryActionClass,
  secondaryActionInlineClass
} from "@/components/user/user-action-styles";

export async function UserPageShell({
  children,
  className,
  contentClassName
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** @deprecated Kept for call-site compatibility; Mini App has one width only. */
  width?: "default" | "narrow";
}) {
  const user = await getOptionalCurrentUser();
  const needsCompletion = Boolean(
    user && (!user.firstName?.trim() || !user.lastName?.trim())
  );

  return (
    <main className={cn("min-h-screen overflow-x-clip text-slate-100", className)}>
      <div
        className={cn(
          "mx-auto min-w-0 overflow-x-clip px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5",
          miniAppWidthClass,
          contentClassName
        )}
      >
        {children}
      </div>
      <ProfileCompletePrompt needsCompletion={needsCompletion} />
      <UserNav />
    </main>
  );
}
