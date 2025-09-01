'use client';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { LanguageCode } from '@/lib/utils/i18n-server';

interface PlayerLanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
}

export default function PlayerLanguageSwitcher(props: PlayerLanguageSwitcherProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  // Update user profile mutation
  const updateProfileMutation = api.profile.updateLanguagePreference.useMutation({
    onSuccess: () => {
      addNotification('Language updated successfully', 'success');
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update language preference', 'error');
    },
  });

  const handleLanguageChange = async (language: LanguageCode) => {
    if (user) {
      await updateProfileMutation.mutateAsync({
        language: language,
      });
    }
  };

  return (
    <LanguageSwitcher 
      {...props}
      persistToDatabase={true}
      onLanguageChange={handleLanguageChange}
    />
  );
}
