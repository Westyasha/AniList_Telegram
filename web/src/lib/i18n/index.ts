import { createContext, useContext } from "react";
import type { Lang } from "@/api/types";
import { en, type Dict } from "./en";
import { ru } from "./ru";

export type { Dict };

export const dictionaries: Record<Lang, Dict> = { en, ru };

export interface I18nValue {
  lang: Lang;
  t: Dict;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18nValue>({ lang: "en", t: en, setLang: () => undefined });

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function useT(): Dict {
  return useContext(I18nContext).t;
}

export function detectLang(hint?: string | null): Lang {
  const source = hint ?? (typeof navigator === "undefined" ? "en" : navigator.language);
  return source.toLowerCase().startsWith("ru") || source.toLowerCase().startsWith("uk") || source.toLowerCase().startsWith("be")
    ? "ru"
    : "en";
}
