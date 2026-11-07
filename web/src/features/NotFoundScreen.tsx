"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useMounted } from "@/lib/hooks";
import { Mark } from "@/components/brand/Mark";

export function NotFoundScreen() {
  const t = useT();
  const mounted = useMounted();
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-6 px-4 pt-safe">
      <Mark size={40} />
      <div className="flex flex-col gap-1">
        <p className="figure text-13 text-fg3">404</p>
        <h1 className="text-24 font-semibold text-fg">{mounted ? t.common.notFound : " "}</h1>
      </div>
      <Link href="/" className="inline-flex h-11 items-center rounded-control border border-line bg-s2 px-4 text-15 font-medium text-fg transition-colors hover:bg-s3">
        {mounted ? t.common.goHome : " "}
      </Link>
    </main>
  );
}
