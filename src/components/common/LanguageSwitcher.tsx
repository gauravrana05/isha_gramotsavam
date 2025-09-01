'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { Globe, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
  persistToDatabase?: boolean;
  onLanguageChange?: (language: LanguageCode) => Promise<void> | void;
}

export default function LanguageSwitcher({ 
  isCollapsed = false,
  showText = true,
  persistToDatabase = false,
  onLanguageChange
}: LanguageSwitcherProps) {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  const currentLang = lang as LanguageCode;

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    if (newLanguage === currentLang || isUpdating) return;

    setIsUpdating(true);
    
    try {
      // Call custom handler if provided
      if (onLanguageChange) {
        await onLanguageChange(newLanguage);
      }

      // Navigate to new language route
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/');
      
      if (pathSegments[1]) {
        pathSegments[1] = newLanguage;
        const newPath = pathSegments.join('/');
        router.push(newPath);
      }
    } catch (error) {
      console.error('Language change failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isCollapsed && !showText) {
    return (
      <button
        onClick={() => {/* Could open a modal or dropdown */}}
        className="flex items-center justify-center w-full p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        disabled={isUpdating}
        title={t('common.change_language', 'Change Language')}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Globe className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Globe className="w-4 h-4 text-gray-500" />
      <Select
        value={currentLang}
        onValueChange={handleLanguageChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto text-xs font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
    </div>
  );
}
