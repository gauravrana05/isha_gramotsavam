"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { LanguageCode } from '@/lib/utils/i18n-server';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/server/trpc/react';
import LanguageSelectionModal from '@/components/volunteer/LanguageSelectionModal';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';

export default function VolunteerMainPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const router = useRouter();
  
  // Language modal state
  const showLanguageModal = searchParams.get('showLanguageModal') === 'true';
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(showLanguageModal);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);

  // Language preference mutation
  const updateLanguageMutation = api.profile.updateLanguagePreference.useMutation({
    onSuccess: () => {
      addNotification('Language preference updated successfully', 'success');
      setIsUpdatingLanguage(false);
      setIsLanguageModalOpen(false);
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update language preference', 'error');
      setIsUpdatingLanguage(false);
    }
  });
  
  // Assignments query for redirect logic and display
  const { 
    data: assignmentsData, 
    isLoading: assignmentsLoading, 
    error: assignmentsError 
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { 
      enabled: !authLoading && !!user && !!user.id && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || ''),
    }
  );

  // Handle language preference detection and redirects
  useEffect(() => {
    if (authLoading || assignmentsLoading || !user || !userProfile || !lang) {
      return;
    }

    // Only handle volunteer roles
    if (!['general_volunteer', 'technical_volunteer'].includes(userProfile.role || '')) {
      return;
    }

    // Check if user has no language preference - show language modal
    if (!userProfile.languagePreference) {
      setIsLanguageModalOpen(true);
      return;
    }

    // Skip redirect if showing language modal
    if (showLanguageModal) {
      return;
    }

    // If user has language preference and assignments, redirect to venue dashboard
    if (userProfile.languagePreference && assignmentsData && assignmentsData.length > 0) {
      const firstAssignment = assignmentsData[0];
      const venueId = firstAssignment.venueLevelMapping?.venue?.id;
      if (venueId) {
        router.push(`/${lang}/volunteer/venues/${venueId}/dashboard`);
        return;
      }
    }
  }, [authLoading, assignmentsLoading, assignmentsData, user, userProfile, lang, showLanguageModal, router]);

  // Handle language selection
  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    if (!languageCode) {
      addNotification('Please select a language', 'error');
      return;
    }
    
    setIsUpdatingLanguage(true);
    try {
      const result = await updateLanguageMutation.mutateAsync({ language: languageCode });
      
      // After successful language update, redirect to venue dashboard with new language
      if (assignmentsData && assignmentsData.length > 0) {
        const firstAssignment = assignmentsData[0];
        const venueId = firstAssignment.venueLevelMapping?.venue?.id;
        if (venueId) {
          router.push(`/${languageCode}/volunteer/venues/${venueId}/dashboard`);
        }
      }
    } catch (error) {
      console.error('Failed to update language:', error);
      setIsUpdatingLanguage(false);
    }
  };

  // Handle cancel - redirect to venue dashboard with current language
  const handleLanguageCancel = () => {
    if (assignmentsData && assignmentsData.length > 0) {
      const firstAssignment = assignmentsData[0];
      const venueId = firstAssignment.venueLevelMapping?.venue?.id;
      if (venueId) {
        router.push(`/${lang}/volunteer/venues/${venueId}/dashboard`);
      }
    } else {
      setIsLanguageModalOpen(false);
    }
  };


  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">{t('volunteer.loading_assignment', 'Loading your assignment...')}</p>
        </div>
      </div>
    );
  }


  // Show no assignments message if user has language preference but no venue assignments
  if (user && userProfile?.languagePreference && !assignmentsLoading) {
    if (assignmentsError || !assignmentsData || assignmentsData.length === 0) {
      return (
        <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('volunteer.no_venue_assignments', 'No Venue Assignments')}
            </h1>
            <p className="text-gray-600 mb-4">
              {t('volunteer.no_venue_assignments_desc', "You haven't been assigned to any venues yet. Please contact your administrator.")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              {t('volunteer.refresh', 'Refresh')}
            </button>
          </div>
        </div>
      );
    }
  }

  // Default loading state (navigation hook will handle redirects)
  return (
    <>
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">{t('volunteer.loading', 'Loading...')}</p>
        </div>
      </div>
      
      {/* Language Selection Modal - Always rendered but controlled by isOpen */}
      <LanguageSelectionModal
        isOpen={isLanguageModalOpen}
        onLanguageSelect={handleLanguageSelect}
        onCancel={handleLanguageCancel}
        onClose={() => setIsLanguageModalOpen(false)}
        currentLanguage={lang as LanguageCode}
        isLoading={isUpdatingLanguage}
      />
    </>
  );
}