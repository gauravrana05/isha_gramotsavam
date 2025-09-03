"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from '@/lib/utils/i18n';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { Globe } from 'lucide-react';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface VolunteerLanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
}

export default function VolunteerLanguageSwitcher({ 
  isCollapsed = false,
  showText = true 
}: VolunteerLanguageSwitcherProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const router = useRouter();
  const { lang } = useParams();
  const { user } = useAuth();
  const { language, switchLanguage } = useLanguage();
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  // Get current language
  const currentLang = (lang as LanguageCode) || language;
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  // Update user profile mutation
  const updateProfileMutation = api.profile.update.useMutation({
    onSuccess: () => {
      addNotification('Language updated successfully', 'success');
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update language preference', 'error');
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    if (newLanguage === currentLang) return;

    setIsUpdating(true);

    try {
      // Update user preference in database first
      if (user) {
        await updateProfileMutation.mutateAsync({
          preferredLanguage: newLanguage,
        });
      }
      
      // Navigate to new language route and force reload
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/');
      
      if (pathSegments[1]) {
        pathSegments[1] = newLanguage;
        const newPath = pathSegments.join('/');
        // Force a hard navigation to ensure the language context updates
        window.location.href = newPath;
      }
    } catch (error) {
      setIsUpdating(false);
      // Error handling is done in the mutation callbacks
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative">
        <Select value={currentLang} onValueChange={handleLanguageChange} disabled={isUpdating}>
          <SelectTrigger className="flex items-center justify-center w-9 h-9 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border-0 bg-transparent p-0 [&>[data-radix-select-icon]]:hidden">
            <Globe className="w-4 h-4" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.nativeName} ({language.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="relative">
      <Select value={currentLang} onValueChange={handleLanguageChange} disabled={isUpdating}>
        <SelectTrigger className="w-full text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 px-2 border-0 bg-transparent">
          <div className="flex items-center">
            <Globe className="w-4 h-4 flex-shrink-0 mr-2" />
            {showText && (
              <span className="truncate">
                {currentLanguage?.nativeName || currentLang}
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.nativeName} ({language.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}