"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContextWrapper';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { LanguageCode } from '@/lib/utils/i18n-server';
import { Loader2, AlertCircle, Wifi, WifiOff, Upload, CheckCircle, Clock } from 'lucide-react';
import { api } from '@/server/trpc/react';
import LanguageSelectionModal from '@/components/volunteer/LanguageSelectionModal';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';

export default function VolunteerMainPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { 
    isOnline, 
    connectionQuality, 
    syncStatus, 
    pendingActions, 
    preloadVolunteerData, 
    getSyncStats 
  } = useOffline();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const router = useRouter();
  
  // Language modal state
  const showLanguageModal = searchParams.get('showLanguageModal') === 'true';
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);

  // Get tRPC utils for query invalidation
  const utils = api.useUtils();

  // Language preference mutation
  const updateLanguageMutation = api.profile.updateLanguagePreference.useMutation({
    onSuccess: async () => {
      addNotification('Language preference updated successfully', 'success');
      setIsUpdatingLanguage(false);
      
      // Invalidate profile queries to refresh user data immediately
      await utils.profile.checkCompletion.invalidate();
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

  // Handle redirects for users with language preferences
  useEffect(() => {
    if (authLoading || assignmentsLoading || !user || !userProfile || !lang) {
      return;
    }

    // Only handle volunteer roles
    if (!['general_volunteer', 'technical_volunteer'].includes(userProfile.role || '')) {
      return;
    }

    // Skip redirect if showing language modal
    if (showLanguageModal) {
      return;
    }

    // Preload volunteer data when user is available
    if (user?.id) {
      preloadVolunteerData(user.id, { 
        priorityLevel: 'critical',
        forceRefresh: false 
      }).catch(console.error);
    }

    // If user has language preference and assignments, redirect to venue dashboard
    if (userProfile.languagePreference && assignmentsData && assignmentsData.length > 0) {
      const firstAssignment = assignmentsData[0];
      const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
      if (venueId) {
        // Preload full venue data before redirect
        preloadVolunteerData(user.id, {
          priorityLevel: 'full',
          venueId: venueId,
          forceRefresh: false
        }).catch(console.error);
        
        router.push(`/${lang}/volunteer/venues/${venueId}/dashboard`);
        return;
      }
    }
  }, [authLoading, assignmentsLoading, assignmentsData, user, userProfile, lang, showLanguageModal, router, preloadVolunteerData]);

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
        const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
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
      const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
      if (venueId) {
        router.push(`/${lang}/volunteer/venues/${venueId}/dashboard`);
      }
    }
    // Note: If no assignments, user stays on this page
    // The modal is controlled by conditional rendering, not state
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


  // Show language selection modal if user has no language preference
  if (user && userProfile && !userProfile.languagePreference && !assignmentsLoading) {
    return (
      <>
        <div className="lg:min-h-screen bg-gray-50">
          {/* Clean background for language modal */}
        </div>
        
        {/* Language Selection Modal - Always open when user has no language preference */}
        <LanguageSelectionModal
          isOpen={true}
          onLanguageSelect={handleLanguageSelect}
          onCancel={handleLanguageCancel}
          onClose={handleLanguageCancel}
          currentLanguage={lang as LanguageCode}
          isLoading={isUpdatingLanguage}
        />
      </>
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
    <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-200 px-4 py-2 z-50">
          <div className="flex items-center justify-center gap-2 text-yellow-800">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Working Offline</span>
            {pendingActions.length > 0 && (
              <span className="bg-yellow-200 px-2 py-1 rounded-full text-xs">
                {pendingActions.length} pending
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sync Status Indicator */}
      {isOnline && syncStatus === 'syncing' && (
        <div className="fixed top-0 left-0 right-0 bg-blue-100 border-b border-blue-200 px-4 py-2 z-50">
          <div className="flex items-center justify-center gap-2 text-blue-800">
            <Upload className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Syncing data...</span>
          </div>
        </div>
      )}

      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
        <p className="text-gray-600">{t('volunteer.loading', 'Loading...')}</p>
        
        {/* Connection Quality Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span>Online ({connectionQuality})</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-yellow-500" />
              <span>Offline Mode</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}