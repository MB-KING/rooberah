"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      theme="dark"
      richColors
      closeButton
      offset={{ top: 16 }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))" }}
      toastOptions={{
        duration: 2800,
        closeButtonAriaLabel: "بستن",
        style: {
          fontFamily: '"Vazirmatn Variable", Tahoma, "Segoe UI", Arial, sans-serif'
        }
      }}
    />
  );
}
