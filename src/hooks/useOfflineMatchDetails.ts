import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOfflineBase } from './useOfflineBase';

/**
 * Hook for managing individual match details with offline-first approach
 * Provides match data, teams, players, and real-time updates
 */
export function useOfflineMatchDetails(matchId: string) {
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // API fallback for match details
  const { 
    data: apiMatchData, 
    isLoading: apiLoading,
    error: apiError,
    refetch: refetchApi
  } = api.volunteers.match.getMatchDetails.useQuery(
    { matchId },
    { 
      enabled: !!matchId && !!user?.id,
      retry: false 
    }
  );

  const loadMatchDetails = useCallback(async () => {
    if (!user?.id || !matchId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Prefer API data when available (has complete relations)
      if (apiMatchData) {
        setMatch(apiMatchData);
        console.log('✅ Using API match details with relations');
      } else {
        // Fallback to offline storage
        const service = getVolunteerService();
        const matchData = await service.getMatch(matchId, user.id);
        setMatch(matchData);
        console.log('📱 Using offline match details');
      }
      
    } catch (err) {
      console.error('Failed to load match details:', err);
      // Final fallback to API data on error
      if (apiMatchData) {
        setMatch(apiMatchData);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, matchId, apiMatchData]);

  useEffect(() => {
    loadMatchDetails();
  }, [loadMatchDetails]);

  const refetch = useCallback(async () => {
    await Promise.all([
      loadMatchDetails(),
      refetchApi()
    ]);
  }, [loadMatchDetails, refetchApi]);

  return {
    data: match,
    match,
    isLoading: isLoading || apiLoading,
    error: error || apiError,
    refetch,
  };
}
