"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Globe, Check, Loader2 } from 'lucide-react';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLanguageSelected?: (language: LanguageCode) => void;
}

export default function LanguageSelectionModal({ 
  isOpen, 
  onClose, 
  onLanguageSelected 
}: LanguageSelectionModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  // Update user profile mutation
  const updateProfileMutation = api.profile.update.useMutation({
    onSuccess: () => {
      addNotification({
        type: 'success',
        message: 'Language preference saved successfully',
      });
      
      // Redirect to the new language route
      if (selectedLanguage) {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/');
        
        // Replace the language segment in the URL
        if (pathSegments[1] && pathSegments[1] !== selectedLanguage) {
          pathSegments[1] = selectedLanguage;
          const newPath = pathSegments.join('/');
          
          // Call the callback if provided
          onLanguageSelected?.(selectedLanguage);
          
          // Navigate to the new language path
          router.push(newPath);
        }
      }
      
      onClose();
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to save language preference',
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleLanguageSelect = (language: LanguageCode) => {
    setSelectedLanguage(language);
  };

  const handleSavePreference = async () => {
    if (!selectedLanguage || !user) return;
    
    setIsSaving(true);
    
    try {
      await updateProfileMutation.mutateAsync({
        preferredLanguage: selectedLanguage,
      });
    } catch (error) {
      // Error handling is done in the mutation callbacks
    }
  };

  const handleCancel = () => {
    setSelectedLanguage(null);
    onClose();
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('volunteer.language_selection.title', 'Choose Your Language')}
      subtitle={t('volunteer.language_selection.subtitle', 'Select your preferred language for the volunteer interface')}
      size="md"
      mobileFullScreen={false}
      footer={
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('volunteer.language_selection.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSavePreference}
            disabled={!selectedLanguage || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('volunteer.language_selection.save_preference', 'Save Language Preference')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-[#F28C38] bg-opacity-10 rounded-full flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#F28C38]" />
          </div>
        </div>

        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((language) => (
            <div
              key={language.code}
              onClick={() => handleLanguageSelect(language.code as LanguageCode)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedLanguage === language.code
                  ? 'border-[#F28C38] bg-[#F28C38] bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-medium text-gray-900">
                      {language.nativeName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {language.name}
                    </span>
                  </div>
                </div>
                
                {selectedLanguage === language.code && (
                  <div className="flex items-center justify-center w-6 h-6 bg-[#F28C38] rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current selection indicator */}
        {userProfile?.preferredLanguage && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current preference:</strong>{' '}
              {SUPPORTED_LANGUAGES.find(l => l.code === userProfile.preferredLanguage)?.nativeName || userProfile.preferredLanguage}
            </p>
          </div>
        )}
      </div>
    </EnhancedModal>
  );
}