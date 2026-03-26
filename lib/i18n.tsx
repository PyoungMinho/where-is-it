"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import ko, { type Translations } from "./translations/ko";
import en from "./translations/en";
import ja from "./translations/ja";
import zh from "./translations/zh";

export type Locale = "ko" | "en" | "ja" | "zh";

const translations: Record<Locale, Translations> = { ko, en, ja, zh };

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

const STORAGE_KEY = "where-is-it-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in translations) return saved as Locale;
  const browserLang = navigator.language.split("-")[0];
  if (browserLang in translations) return browserLang as Locale;
  return "ko";
}

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextType>({
  locale: "ko",
  setLocale: () => {},
  t: ko,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
