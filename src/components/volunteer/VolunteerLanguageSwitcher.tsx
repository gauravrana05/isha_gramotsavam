"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';

interface VolunteerLanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
}

export default function VolunteerLanguageSwitcher({ 
  isCollapsed = false,
  showText = true 
}: VolunteerLanguageSwitcherProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();
  const { t, language } = useTranslation();
  const { addNotification } = useNotification();

  // Get current language
  const currentLang = (lang as LanguageCode) || language;
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  // Update user profile mutation
  const updateProfileMutation = api.profile.update.useMutation({
    onSuccess: () => {
      addNotification({
        type: 'success',
        message: 'Language updated successfully',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error', 
        message: error.message || 'Failed to update language preference',
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    if (newLanguage === currentLang) {
      setIsDropdownOpen(false);
      return;
    }

    setIsUpdating(true);
    setIsDropdownOpen(false);

    try {
      // Update user preference in database
      if (user) {
        await updateProfileMutation.mutateAsync({
          preferredLanguage: newLanguage,
        });
      }

      // Navigate to new language route
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/');
      
      // Replace the language segment in the URL
      if (pathSegments[1]) {
        pathSegments[1] = newLanguage;
        const newPath = pathSegments.join('/');
        router.push(newPath);
      }
    } catch (error) {
      // Error handling is done in the mutation callbacks
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-center w-9 h-9 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          title="Change Language"
          disabled={isUpdating}
        >
          <Globe className="w-4 h-4" />
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsDropdownOpen(false)} 
            />
            
            {/* Dropdown */}
            <div className="absolute left-12 top-0 z-20 min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="py-2">
                {SUPPORTED_LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code as LanguageCode)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 ${
                      currentLang === language.code ? 'bg-[#F28C38] bg-opacity-10 text-[#F28C38]' : 'text-gray-700'
                    }`}
                    disabled={isUpdating}
                  >
                    <div className="text-left">
                      <div className="font-medium">{language.nativeName}</div>
                      <div className="text-xs opacity-75">{language.name}</div>
                    </div>
                    
                    {currentLang === language.code && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 px-2"
        disabled={isUpdating}
      >
        <div className="flex items-center">
          <Globe className="w-4 h-4 flex-shrink-0 mr-2" />
          {showText && (
            <span className="truncate">
              {currentLanguage?.nativeName || currentLang}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="py-2">
              {SUPPORTED_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code as LanguageCode)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 ${
                    currentLang === language.code ? 'bg-[#F28C38] bg-opacity-10 text-[#F28C38]' : 'text-gray-700'
                  }`}
                  disabled={isUpdating}
                >
                  <div className="text-left">
                    <div className="font-medium">{language.nativeName}</div>
                    <div className="text-xs opacity-75">{language.name}</div>
                  </div>
                  
                  {currentLang === language.code && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}