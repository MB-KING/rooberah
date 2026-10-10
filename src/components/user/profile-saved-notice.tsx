"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ProfileSavedNotice({ show }: { show: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!show) return;
    toast.success("پروفایل ذخیره شد", { id: "profile-save" });
    router.replace("/", { scroll: false });
  }, [show, router]);

  return null;
}
