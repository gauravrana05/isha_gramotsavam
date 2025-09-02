"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/server/trpc/react';
import { useRouter } from 'next/navigation';

export default function VolunteerMainPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useParams();
  const { t } = useTranslation();
  const router = useRouter();
  
  // Get volunteer assignments
  const queryEnabled = !authLoading && !!user && ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user?.role || '');
  
  const { 
    data: assignmentsData, 
    isLoading: assignmentsLoading, 
    error: assignmentsError 
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { enabled: queryEnabled }
  );

  // Catch-all: Show full page loader for ANY loading state or missing data
  if (authLoading || !user || !lang || assignmentsLoading || (queryEnabled && assignmentsData === undefined)) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">{t('volunteer.loading_assignment', 'Loading your assignment...')}</p>
        </div>
      </div>
    );
  }

  // Handle immediate redirect to venue dashboard
  useEffect(() => {
    if (authLoading || !user || !lang) {
      return;
    }

    // Check if user is a volunteer
    if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user?.role || '')) {
      return;
    }

    // Start loading assignments and redirect as soon as we have data
    if (!assignmentsLoading && assignmentsData && assignmentsData.length > 0) {
      const firstAssignment = assignmentsData[0];
      const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
      
      if (venueId) {
        router.replace(`/${lang}/volunteer/venues/${venueId}/dashboard`);
        return;
      }
    }
  }, [authLoading, assignmentsLoading, assignmentsData, user, lang, router]);

  // Show loader if user is not a volunteer (will redirect elsewhere via layout)
  if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user?.role || '')) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show not authorized if assignments loaded but empty or error
  if (assignmentsError || !assignmentsData || assignmentsData.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-[#F28C38] mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Not Authorized
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            You are not assigned to any venue. Please contact your administrator for venue assignment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-3 rounded-lg hover:bg-[#E67A26] transition-colors font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Default loading state (should redirect via useEffect)
  return (
    <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#F28C38] mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
