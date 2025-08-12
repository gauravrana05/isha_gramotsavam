"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode, loadAndCacheTranslation } from "@/lib/utils/i18n";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  switchLanguage: (lang: LanguageCode) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(false);

  // Always use hooks, but handle SSR gracefully
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile } = useAuth();

  // Initialize language from route params or user preference
  useEffect(() => {
    const initializeLanguage = async () => {
      let targetLang: LanguageCode = DEFAULT_LANGUAGE;

      // 1. Try to get language from URL params (highest priority)
      if (params?.lang && isValidLanguageCode(params.lang as string)) {
        targetLang = params.lang as LanguageCode;
      } 
      // 2. Fallback to user's preferred language if no valid URL lang
      else if (userProfile?.preferredLanguage && isValidLanguageCode(userProfile.preferredLanguage)) {
        targetLang = userProfile.preferredLanguage as LanguageCode;
      }

      // Load and cache the translation
      try {
        setIsLoading(true);
        await loadAndCacheTranslation(targetLang);
        setLanguage(targetLang);
      } catch (error) {
        console.warn(`Failed to load language ${targetLang}, using default`);
        setLanguage(DEFAULT_LANGUAGE);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [params?.lang, userProfile?.preferredLanguage]);

  // Function to switch language and update URL
  const switchLanguage = (newLang: LanguageCode) => {
    if (!isValidLanguageCode(newLang)) {
      console.warn(`Invalid language code: ${newLang}`);
      return;
    }

    setIsLoading(true);
    
    // Load the new language translations
    loadAndCacheTranslation(newLang).then(() => {
      setLanguage(newLang);
      
      // Update the URL to reflect the new language (only on client-side)
      if (router && pathname) {
        const currentPath = pathname;
        const pathSegments = currentPath.split('/');
        
        // Replace the language segment in the URL
        if (pathSegments[1] && isValidLanguageCode(pathSegments[1])) {
          pathSegments[1] = newLang;
        } else {
          // If no language in URL, add it
          pathSegments.splice(1, 0, newLang);
        }
        
        const newPath = pathSegments.join('/');
        router.push(newPath);
      }
      
      setIsLoading(false);
    }).catch((error) => {
      console.error(`Failed to switch to language ${newLang}:`, error);
      setIsLoading(false);
    });
  };

  // Helper function to update language without navigation (for internal use)
  const setLanguageInternal = (lang: LanguageCode) => {
    if (isValidLanguageCode(lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage: setLanguageInternal, 
        switchLanguage,
        isLoading 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};