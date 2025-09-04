import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOfflineBase } from './useOfflineBase';
import { api } from '@/server/trpc/react';

export function useOfflineMatches(venueId?: string, filters?: any) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // API fallback
  const { data: apiMatches } = api.volunteers.venue.getVenueMatches.useQuery(
    { venueId: venueId!, filters },
    { enabled: !!venueId && !!user?.id, retry: false }
  );

  const loadMatches = useCallback(async () => {
    if (!venueId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      const matchesData = await service.getMatchesForVenue(
        venueId, 
        filters?.date, 
        user.id
      );
      
      // Use offline data if available, otherwise fallback to API
      if (matchesData.length > 0) {
        setMatches(matchesData);
      } else if (apiMatches?.length) {
        setMatches(apiMatches);
      } else {
        setMatches([]);
      }
      
    } catch (err) {
      console.error('Failed to load matches:', err);
      // Fallback to API data on error
      if (apiMatches?.length) {
        setMatches(apiMatches);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id, JSON.stringify(filters), apiMatches]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: loadMatches,
  };
}

export function useOfflineMatchDetails(matchId?: string) {
  return useOfflineBase('getMatchDetails', { matchId }, { 
    enabled: !!matchId 
  });
}
