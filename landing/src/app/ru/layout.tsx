import type { ReactNode } from "react";
import { RootShell, rootMetadata, rootViewport } from "@/components/RootShell";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function Layout({ children }: { children: ReactNode }) {
  return <RootShell lang="ru">{children}</RootShell>;
}
