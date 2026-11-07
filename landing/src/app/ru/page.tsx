import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = {
  title: COPY.ru.meta.title,
  description: COPY.ru.meta.description,
  alternates: { canonical: "./ru/", languages: { en: "./" } },
  openGraph: { title: COPY.ru.meta.title, description: COPY.ru.meta.description, locale: "ru_RU" },
};

export default function Page() {
  return <Landing locale="ru" />;
}
