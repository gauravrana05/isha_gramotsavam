/**
 * Server-side i18n utilities
 * Functions that can be used in server components
 */

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

/**
 * Server-compatible function to validate language code
 * Can be used in server components and server actions
 */
export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Get language display name
 */
export const getLanguageName = (code: LanguageCode, native = false): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? (native ? lang.nativeName : lang.name) : code;
};

/**
 * Get default language for server-side operations
 */
export const getDefaultLanguage = (): LanguageCode => DEFAULT_LANGUAGE;