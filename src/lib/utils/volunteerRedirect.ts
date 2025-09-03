import { api } from '@/server/trpc/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook that handles volunteer redirect logic
 * Shows full page loader while fetching assignments, then redirects to venue dashboard
 */
export const useVolunteerRedirect = (lang: string) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Only fetch assignments for volunteers
  const isVolunteer = user && ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role);
  
  const { 
    data: assignments, 
    isLoading: assignmentsLoading,
    error: assignmentsError
  } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { enabled: !authLoading && !!user && !!isVolunteer }
  );

  useEffect(() => {
    if (!authLoading && user && lang && isVolunteer && !assignmentsLoading && assignments?.length) {
      const firstAssignment = assignments[0];
      const venueId = firstAssignment?.venueLevelMapping?.venue?.id;
      
      if (venueId) {
        router.replace(`/${lang}/volunteer/venues/${venueId}/dashboard`);
      }
    }
  }, [authLoading, user, lang, isVolunteer, assignmentsLoading, assignments, router]);

  return {
    isLoading: authLoading || assignmentsLoading,
    hasAssignments: assignments?.length > 0,
    error: assignmentsError,
    isVolunteer
  };
};

/**
 * Full page loader component for volunteer redirects
 */
export const VolunteerRedirectLoader = ({ message = "Loading your assignment..." }: { message?: string }) => (
  <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);