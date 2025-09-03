"use client";

import { useState } from 'react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { Check, Globe } from 'lucide-react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onLanguageSelect: (languageCode: LanguageCode) => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  currentLanguage?: LanguageCode;
  isLoading?: boolean;
}

export default function LanguageSelectionModal({
  isOpen,
  onLanguageSelect,
  onCancel,
  onClose,
  currentLanguage,
  isLoading = false
}: LanguageSelectionModalProps) {
  
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(currentLanguage || null);

  const handleLanguageClick = (languageCode: LanguageCode) => {
    setSelectedLanguage(languageCode);
  };

  const handleSave = async () => {
    if (selectedLanguage && typeof onLanguageSelect === 'function') {
      try {
        await onLanguageSelect(selectedLanguage);
      } catch (error) {
        console.error('Error in onLanguageSelect:', error);
      }
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else if (typeof onClose === 'function') {
      onClose();
    }
  };

  const getLanguageFlag = (code: LanguageCode) => {
    const flags: Record<LanguageCode, string> = {
      en: '🇺🇸',
      ta: '🇮🇳',
      hi: '🇮🇳',
      ml: '🇮🇳',
      te: '🇮🇳',
      kn: '🇮🇳',
      or: '🇮🇳'
    };
    return flags[code] || '🌐';
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Language"
      size="lg"
      mobileFullScreen={true}
      showCloseButton={false}
      footer={
        <div className="flex justify-between sm:justify-end gap-3 pt-4">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 sm:w-32 sm:flex-none px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !selectedLanguage}
            className="flex-1 sm:w-32 sm:flex-none px-6 py-3 text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              'Save'
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6 bg-gray-50">
        {/* Subtitle */}
        <p className="text-gray-600 text-center text-sm md:text-base">
          Select your preferred language for the best experience
        </p>

        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageClick(language.code as LanguageCode)}
              disabled={isLoading}
              className={`
                w-full sm:w-[calc(50%-0.5rem)] flex items-center justify-start sm:justify-center p-4 rounded-lg border-2 
                transition-all duration-300 min-h-[70px] sm:min-h-[80px] box-border relative
                appearance-none bg-white hover:shadow-lg hover:shadow-orange-200 active:opacity-90
                ${selectedLanguage === language.code
                  ? 'border-[#F28C38] bg-orange-50 text-[#F28C38]'
                  : 'border-gray-200 hover:border-[#F28C38] hover:border-orange-200'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection indicator */}
              {selectedLanguage === language.code && (
                <div className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 sm:ml-auto">
                  <Check className="w-4 h-4 text-[#F28C38]" />
                </div>
              )}

              {/* Mobile: Row layout */}
              <div className="flex items-center w-full sm:hidden">
                {/* Flag/Icon */}
                <div className="text-2xl mr-4 w-8 h-8 flex items-center justify-center">
                  {getLanguageFlag(language.code as LanguageCode)}
                </div>

                {/* Language names */}
                <div className="flex-grow text-left">
                  <div className="font-medium text-base mb-1">
                    {language.nativeName}
                  </div>
                  {language.code !== 'en' && (
                    <div className="text-sm text-gray-500">
                      {language.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: Column layout */}
              <div className="hidden sm:block text-center w-full">
                {/* Flag/Icon */}
                <div className="text-3xl mb-3 flex justify-center items-center h-12">
                  {getLanguageFlag(language.code as LanguageCode)}
                </div>

                {/* Language names */}
                <div>
                  <div className="font-medium text-base mb-1">
                    {language.nativeName}
                  </div>
                  {language.code !== 'en' && (
                    <div className="text-sm text-gray-500">
                      {language.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Loading overlay */}
              {isLoading && selectedLanguage === language.code && (
                <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#F28C38] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center text-sm text-gray-600">
            Updating preference...
          </div>
        )}
      </div>
    </EnhancedModal>
  );
}
