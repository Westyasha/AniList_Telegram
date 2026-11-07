import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = { title: "AniList login", referrer: "no-referrer" };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-dvh bg-bg" />}>{children}</Suspense>;
}
