"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams();
  const [language, setLanguage] = useState<string>("en");

  useEffect(() => {
    if (params?.lang) {
      setLanguage(params.lang as string);
    }
  }, [params]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
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