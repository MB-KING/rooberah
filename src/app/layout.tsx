import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { QueryProvider } from "@/components/query-provider";
import { TelegramProvider } from "@/components/telegram/telegram-provider";
import { ReferralCapture } from "@/components/user/referral-capture";
import { APP_NAME, APP_SLOGAN, BRAND_ICON_SRC, brandColors } from "@/shared/brand";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap"
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_SLOGAN,
  icons: {
    icon: BRAND_ICON_SRC,
    apple: BRAND_ICON_SRC
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: brandColors.ember
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
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
