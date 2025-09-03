"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContextWrapper';
import { api } from '@/server/trpc/react';
import { useTranslation } from '@/lib/utils/i18n';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { VolunteerPageLoader } from '@/components/ui';

// Full page loader for volunteer redirect
const VolunteerRedirectLoader = ({ message }: { message: string }) => (
  <VolunteerPageLoader title={message} />
);

// Not authorized component
const NotAuthorized = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-8">
      <AlertCircle className="w-16 h-16 text-[#F28C38] mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {t('volunteer.common.access_denied', 'Not Authorized')}
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        {message}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#F28C38] text-white px-6 py-3 rounded-lg hover:bg-[#E67A26] transition-colors font-medium"
      >
        {t('volunteer.common.refresh', 'Refresh')}
      </button>
    </div>
  </div>
);

export default function VolunteerVenuesRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, connectionQuality, pendingActions } = useOffline();
  const { lang } = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  // Check if user is a volunteer
  const isVolunteer = user && ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role);
  
  // Fetch volunteer assignments
  const { 
    data: assignments, 
    isLoading: assignmentsLoading,
    error: assignmentsError
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { enabled: !authLoading && !!user && !!isVolunteer }
  );

  // Handle redirect when assignments are loaded
  useEffect(() => {
    if (!authLoading && user && lang && isVolunteer && !assignmentsLoading && assignments?.length) {
      const firstAssignment = assignments[0];
      const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
      
      if (venueId) {
        router.replace(`/${lang}/volunteer/venues/${venueId}/dashboard`);
      }
    }
  }, [authLoading, user, lang, isVolunteer, assignmentsLoading, assignments, router]);

  // Loading states
  if (authLoading || assignmentsLoading) {
    return <VolunteerPageLoader title={t('volunteer.loading_assignment', 'Loading your assignment...')} />;
  }

  // Not a volunteer
  if (!isVolunteer) {
    return <VolunteerRedirectLoader message="Redirecting..." />;
  }

  // No assignments or error
  if (assignmentsError || !assignments || assignments.length === 0) {
    return (
      <NotAuthorized 
        message="You are not assigned to any venue. Please contact your administrator for venue assignment." 
      />
    );
  }

  // Has assignments - should redirect via useEffect
  return <VolunteerRedirectLoader message="Redirecting to your venue..." />;
}