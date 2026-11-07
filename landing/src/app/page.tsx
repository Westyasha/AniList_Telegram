import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = {
  title: COPY.en.meta.title,
  description: COPY.en.meta.description,
  alternates: { canonical: "./", languages: { ru: "./ru/" } },
  openGraph: { title: COPY.en.meta.title, description: COPY.en.meta.description, locale: "en_US" },
};

export default function Page() {
  return <Landing locale="en" />;
}
