"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/lib/utils/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/AdvancedSelect";
import { LanguageCode } from "@/lib/utils/i18n";

interface LanguageSelectorProps {
  variant?: "small" | "medium" | "large";
  className?: string;
  showNativeNames?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = "small", 
  className = "w-48 text-sm",
  showNativeNames = false 
}) => {
  const { language, switchLanguage, isLoading } = useLanguage();
  const { supportedLanguages, getLanguageName } = useTranslation();

  const handleLanguageChange = (value: string) => {
    const newLang = value as LanguageCode;
    switchLanguage(newLang);
  };


  return (
    <div className="relative">
      <Select
        value={language}
        onValueChange={handleLanguageChange}
        disabled={isLoading}
      >
        <SelectTrigger className={`font-fira ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Select language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {supportedLanguages.map(lang => (
            <SelectItem key={lang.code} value={lang.code}>
              {showNativeNames ? lang.nativeName : lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;