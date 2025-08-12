"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/lib/utils/i18n";
import Select from "@/components/ui/Select";
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as LanguageCode;
    switchLanguage(newLang);
  };

  const options = supportedLanguages.map(lang => ({
    value: lang.code,
    label: showNativeNames ? 
      `${lang.nativeName}` : 
      lang.name
  }));

  return (
    <div className="relative w-30">
      <Select
        value={language}
        onChange={handleLanguageChange}
        options={options}
        variant={variant}
        className={`font-fira ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Select language"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;