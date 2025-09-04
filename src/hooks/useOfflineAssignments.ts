import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { api } from '@/server/trpc/react';

export function useOfflineAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fallback to API when offline storage is empty
  const { data: apiAssignments, refetch: refetchApiAssignments } = api.volunteers.assignments.getMyAssignments.useQuery(
    undefined,
    { 
      enabled: !!user?.id,
      retry: false 
    }
  );

  const loadAssignments = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent endless loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Assignments loading timeout')), 8000);
      });

      const assignmentsPromise = (async () => {
        const service = getVolunteerService();
        
        // Ensure service is initialized
        await service.initialize(user.id);
        
        return await service.getVolunteerAssignments(user.id);
      })();

      const assignmentsData = await Promise.race([assignmentsPromise, timeoutPromise]);
      
      // If offline storage is empty, use API data as fallback
      if (assignmentsData.length === 0 && apiAssignments?.length) {
        setAssignments(apiAssignments);
      } else {
        setAssignments(assignmentsData);
      }
      
    } catch (err) {
      console.error('Failed to load assignments:', err);
      // Fallback to API data on error
      if (apiAssignments?.length) {
        setAssignments(apiAssignments);
      } else {
        setAssignments([]); // Set empty array to prevent undefined state
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Removed apiAssignments from dependencies to break cycle

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchApiAssignments(),
      loadAssignments()
    ]);
  }, [refetchApiAssignments, loadAssignments]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Separate effect to handle API assignments updates
  useEffect(() => {
    if (apiAssignments && assignments.length === 0 && !isLoading) {
      setAssignments(apiAssignments);
    }
  }, [apiAssignments, assignments.length, isLoading]);

  return {
    assignments,
    isLoading,
    error,
    refetch,
  };
}
