"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { useOfflineAssignments } from '@/hooks/useOfflineAssignments';
import { MapPin, AlertCircle } from 'lucide-react';

export default function VolunteerHomePage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Get volunteer assignments with API fallback
  const { 
    assignments, 
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch
  } = useOfflineAssignments();

  // Debug assignments
  console.log('Volunteer assignments:', assignments);
  console.log('Assignments loading:', assignmentsLoading);
  console.log('Assignments error:', assignmentsError);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, authLoading, router, lang]);

  // Remove auto-redirect - let user stay on homepage
  // useEffect(() => {
  //   if (assignments && assignments.length > 0) {
  //     const primaryVenue = assignments[0];
  //     router.push(`/${lang}/volunteer/venues/${primaryVenue.venueId}/dashboard`);
  //   }
  // }, [assignments, router, lang]);

  // Show loading while checking auth or assignments
  if (authLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show error if failed to load assignments
  if (assignmentsError) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Assignments</h1>
          <p className="text-gray-600 mb-4">Unable to load your venue assignments. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show assignments if available
  if (assignments && assignments.length > 0) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Volunteer!</h1>
            <p className="text-gray-600">Your venue assignments</p>
            
            {/* Data source indicator and sync button */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                🌐 Live Data
              </span>
              
              <button
                onClick={refetch}
                disabled={assignmentsLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {assignmentsLoading ? '🔄 Syncing...' : '🔄 Sync Now'}
              </button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {assignments.map((assignment, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {assignment.venueLevelMapping?.venue?.name || 'Unknown Venue'}
                    </h3>
                    <p className="text-gray-600">Event: {assignment.event?.name || 'Unknown Event'}</p>
                    <p className="text-gray-600">Status: {assignment.status}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/${lang}/volunteer/venues/${assignment.venueLevelMapping?.venue?.id}/dashboard`)}
                    className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show no assignments message if no assignments
  return (
    <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No Venue Assignment</h1>
        <p className="text-gray-600 mb-4">
          You are not assigned to any venue. Please contact the admin to get assigned to a venue.
        </p>
        
        {/* Data source and sync button */}
        <div className="mb-4 flex items-center justify-center gap-4">
          <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            🌐 Live Data
          </span>
          
          <button
            onClick={refetch}
            disabled={assignmentsLoading}
            className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {assignmentsLoading ? '🔄 Syncing...' : '🔄 Check Again'}
          </button>
        </div>
        
        <div className="space-y-2 text-sm text-gray-500">
          <p>Contact: admin@ishagramotsavam.org</p>
          <p>Or reach out to your coordinator</p>
        </div>
      </div>
    </div>
  );
}
