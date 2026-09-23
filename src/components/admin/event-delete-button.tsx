"use client";

import { purgeEventAction } from "@/app/admin/actions";
import { StatusActionButton } from "@/components/admin/status-action-button";

export function EventDeleteButton({ eventId }: { eventId: string }) {
  return (
    <form action={purgeEventAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <StatusActionButton
        danger
        label="حذف کامل برنامه"
        confirmMessage="این برنامه برای همیشه پاک می‌شود؛ ثبت‌نام، حضور، نظرات، عکس‌ها و امتیازهای همین برنامه هم حذف می‌شوند. ادامه می‌دهی؟"
      />
    </form>
  );
}
