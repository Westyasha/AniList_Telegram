import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Overpass, Overpass_Mono } from "next/font/google";
import { Providers } from "@/components/shell/Providers";
import { BOOT_SCRIPT } from "@/lib/appearanceBoot";
import "./globals.css";

const sans = Overpass({ subsets: ["latin", "cyrillic"], variable: "--font-overpass", display: "swap" });
const mono = Overpass_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-overpass-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AniList", template: "%s · AniList" },
  description: "Your AniList list, airing schedule and stats inside Telegram",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0D",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
