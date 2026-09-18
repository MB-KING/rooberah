import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import { QueryProvider } from "@/components/query-provider";
import { TelegramProvider } from "@/components/telegram/telegram-provider";
import { ReferralCapture } from "@/components/user/referral-capture";
import { APP_SLOGAN, APP_TITLE, BRAND_ICON_SRC, brandColors } from "@/shared/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_SLOGAN,
  icons: {
    icon: BRAND_ICON_SRC,
    apple: BRAND_ICON_SRC
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: brandColors.ember
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          <TelegramProvider>
            <ReferralCapture />
            {children}
          </TelegramProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
