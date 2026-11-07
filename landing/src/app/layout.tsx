import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Overpass, Overpass_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = Overpass({ subsets: ["latin", "cyrillic"], variable: "--font-overpass", display: "swap" });
const mono = Overpass_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-overpass-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg` },
  openGraph: {
    type: "website",
    siteName: "AniList for Telegram",
    images: [{ url: `${SITE_URL}/og.jpg`, width: 1600, height: 678 }],
  },
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/og.jpg`] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0B0D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
