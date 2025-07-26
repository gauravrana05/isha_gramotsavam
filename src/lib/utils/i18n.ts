"use client";

import { useLanguage } from "@/context/LanguageContext";
import en from "@/lib/locales/en.json";
import ta from "@/lib/locales/ta.json";

const translations: Record<string, any> = {
  en,
  ta,
  // Add other languages (hi, ml, te, kn, or) here
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return { t, language };
};