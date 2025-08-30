"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/server/trpc/react';

export default function VolunteerMainPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { lang } = useParams();
  
  // Enhanced assignments query with venue details for direct dashboard redirect
  const { 
    data: assignmentsData, 
    isLoading: assignmentsLoading, 
    error: assignmentsError 
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined, // We can extend this later to include venue/event details
    { 
      enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || ''),
    }
  );

  // Enhanced redirect logic - redirect directly to venue dashboard
  useEffect(() => {
    if (authLoading || assignmentsLoading) return;

    // Not authenticated - redirect to login
    if (!user) {
      router.replace(`/${lang}/login`);
      return;
    }

    // Wrong role - redirect to public
    if (!userProfile || !['general_volunteer', 'technical_volunteer'].includes(userProfile.role)) {
      router.replace(`/${lang}/public`);
      return;
    }

    // Has assignments - redirect to first venue dashboard
    if (assignmentsData?.success && assignmentsData.assignments?.length > 0) {
      const firstAssignment = assignmentsData.assignments[0];
      // Extract venue ID from venue location mapping
      const venueId = firstAssignment.venueLocationMapping?.venue?.id || 
                     firstAssignment.venueLocationMappingId?.split('-')[0]; // Fallback extraction
      
      if (venueId) {
        router.replace(`/${lang}/volunteer/venues/${venueId}/dashboard`);
        return;
      }
    }
  }, [user, userProfile, authLoading, assignmentsLoading, assignmentsData, router, lang]);

  if (authLoading || assignmentsLoading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading your assignment...</p>
        </div>
      </div>
    );
  }

  // Display error or no assignments state
  if (assignmentsError || !assignmentsData?.success || !assignmentsData.assignments?.length) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Venue Assignments</h1>
          <p className="text-gray-600 mb-4">
            You haven't been assigned to any venues yet. Please contact your administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Fallback loading state while redirect happens
  return (
    <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your venue...</p>
      </div>
    </div>
  );
}