"use client";

import { useLanguage } from "@/context/LanguageContext";
import en from "@/lib/locales/en.json";
import ta from "@/lib/locales/ta.json";
import hi from "@/lib/locales/hi.json";

// Supported language codes
export type LanguageCode = "en" | "ta" | "hi" | "ml" | "te" | "kn" | "or";

// Language configuration
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
] as const;

// Default language
export const DEFAULT_LANGUAGE: LanguageCode = "en";

// Lazy load translations to improve performance
const loadTranslation = async (lang: LanguageCode) => {
  try {
    switch (lang) {
      case "en":
        return en;
      case "ta":
        return ta;
      case "hi":
        return hi;
      case "ml":
        return (await import("@/lib/locales/ml.json")).default;
      case "te":
        return (await import("@/lib/locales/te.json")).default;
      case "kn":
        return (await import("@/lib/locales/kn.json")).default;
      case "or":
        return (await import("@/lib/locales/or.json")).default;
      default:
        return en;
    }
  } catch (error) {
    console.warn(`Failed to load translation for ${lang}, falling back to English`);
    return en;
  }
};

// Cached translations
const translationCache: Record<string, any> = {
  en,
  ta,
  hi,
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key: string, fallback?: string): string => {
    const currentLang = language as LanguageCode;
    
    // Check cache first
    if (translationCache[currentLang]) {
      const translation = translationCache[currentLang][key];
      if (translation) return translation;
    }

    // Fallback to English
    const englishTranslation = translationCache.en[key];
    if (englishTranslation) return englishTranslation;

    // Return provided fallback or the key itself
    return fallback || key;
  };

  // Helper function to check if translation exists
  const hasTranslation = (key: string, lang?: LanguageCode): boolean => {
    const checkLang = lang || (language as LanguageCode);
    return !!(translationCache[checkLang] && translationCache[checkLang][key]);
  };

  // Function to get language display name
  const getLanguageName = (code: LanguageCode, native = false): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? (native ? lang.nativeName : lang.name) : code;
  };

  return { 
    t, 
    language: language as LanguageCode, 
    hasTranslation, 
    getLanguageName,
    supportedLanguages: SUPPORTED_LANGUAGES 
  };
};

// Utility function to validate language code
export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
};

// Load and cache translation for a specific language
export const loadAndCacheTranslation = async (lang: LanguageCode) => {
  if (!translationCache[lang]) {
    translationCache[lang] = await loadTranslation(lang);
  }
  return translationCache[lang];
};