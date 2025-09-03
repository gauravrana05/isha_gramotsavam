'use client';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { MessageCircle, Users } from 'lucide-react';

export default function VolunteerChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t('volunteer.chat.title', 'Chat')}
        </h1>
      </div>

      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('volunteer.chat.select_venue', 'Select a venue to start chatting')}
        </h3>
        <p className="text-gray-500">
          {t('volunteer.chat.venue_instruction', 'Navigate to a specific venue to access venue chat')}
        </p>
      </div>
    </div>
  );
}
