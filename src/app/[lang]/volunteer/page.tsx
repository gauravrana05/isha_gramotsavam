"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRedirect } from '@/lib/utils/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/server/trpc/react';

export default function VolunteerMainPage() {
  // This hook handles all redirection logic based on user state and role
  // It will automatically redirect volunteers with assignments to their venue page
  // The 'volunteer' role is passed as an allowed role
  useRedirect(['general_volunteer', 'technical_volunteer']);

  const { user, userProfile, loading: authLoading } = useAuth();
  
  // Get volunteer assignments to check for existence and render a message if none exist
  // We enable this query only if the user is a volunteer and not in a redirect loop
  const { 
    data: assignmentsData, 
    isLoading: assignmentsLoading, 
    error: assignmentsError 
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { 
      enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(user?.role || ''),
    }
  );

  if (authLoading || (user && assignmentsLoading)) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // This check is a failsafe. The useRedirect hook should have handled this already.
  if (!user || !userProfile || !['general_volunteer', 'technical_volunteer'].includes(userProfile.role)) {
    return null;
  }

  // Display a message if there are no assignments
  // This will only render if the useRedirect hook did not find a venue to redirect to
  if (assignmentsError || !assignmentsData?.success || !assignmentsData.assignments?.length) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Venue Assignments</h1>
          <p className="text-gray-600 mb-4">
            You havena@apos;t been assigned to any venues yet. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // This should theoretically not be reached if assignments exist, as useRedirect would have pushed a new route.
  // It serves as a final fallback.
  return null;
}