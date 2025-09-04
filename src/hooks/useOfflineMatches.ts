import React from 'react';
import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOfflineBase } from './useOfflineBase';
import { api } from '@/server/trpc/react';

export function useOfflineMatches(venueId?: string, filters?: any) {
  const { user } = useAuth();
  const [matchData, setMatchData] = useState<{ matches: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [forceRefetch, setForceRefetch] = useState(false);
  const hasInitialized = React.useRef(false);

  // Stabilize userId and filters to prevent infinite loops
  const stableUserId = React.useMemo(() => user?.id, [user?.id]);
  const stableFiltersStr = React.useMemo(() => {
    return filters ? JSON.stringify(filters) : '';
  }, [filters]);

  // API fallback
  const { data: apiMatches } = api.volunteers.venue.getVenueMatches.useQuery(
    { venueId: venueId!, filters },
    { enabled: !!venueId && !!user?.id, retry: false }
  );

  const loadMatches = useCallback(async (force = false) => {
    console.log('🔄 loadMatches called', { venueId, stableUserId, force, timestamp: new Date().toISOString() });
    
    if (!venueId || !stableUserId) {
      console.log('❌ loadMatches early return - missing venueId or userId', { venueId, stableUserId });
      setIsLoading(false);
      return;
    }

    // Check if data already exists and is fresh (within 5 minutes) - only if not forced
    if (!force && hasInitialized.current) {
      const now = Date.now();
      const isDataFresh = matchData && lastFetchTime && (now - lastFetchTime) < 5 * 60 * 1000;
      
      if (matchData && isDataFresh) {
        console.log('⏭️ Skipping loadMatches - data exists and is fresh', { 
          matchCount: matchData.matches.length, 
          lastFetchTime: new Date(lastFetchTime).toISOString(),
          ageMinutes: Math.round((now - lastFetchTime) / 1000 / 60)
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log('🚀 loadMatches starting data fetch');
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      const matchesData = await service.getMatchesForVenue(
        venueId, 
        filters?.date, 
        stableUserId
      );
      
      // Use offline data if available
      if (matchesData.length > 0) {
        console.log('✅ Using offline matches data', { count: matchesData.length });
        setMatchData({ matches: matchesData });
        setLastFetchTime(Date.now());
        hasInitialized.current = true;
      } else {
        console.log('ℹ️ No offline matches data available');
        setMatchData({ matches: [] });
        setLastFetchTime(Date.now());
        hasInitialized.current = true;
      }
      
    } catch (err) {
      console.error('❌ loadMatches failed:', err);
      setError(err as Error);
      // Set empty data on error to prevent UI hanging
      setMatchData({ matches: [] });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
    } finally {
      console.log('🏁 loadMatches finished, setting isLoading to false');
      setIsLoading(false);
    }
  }, [venueId, stableUserId, stableFiltersStr]);

  // Initial load effect - only runs once when dependencies change
  useEffect(() => {
    console.log('🔄 useEffect triggered - calling loadMatches', { hasInitialized: hasInitialized.current });
    if (!hasInitialized.current) {
      loadMatches();
    }
  }, [loadMatches]);

  // API fallback effect - handles API data when offline data is not available
  useEffect(() => {
    if (apiMatches && apiMatches.length > 0 && (!matchData || !Array.isArray(matchData.matches) || matchData.matches.length === 0)) {
      console.log('🔄 Using API fallback data', { count: apiMatches.length });
      setMatchData({ matches: apiMatches });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
    }
  }, [apiMatches]);

  // Manual refetch function that forces a refresh
  const refetchData = useCallback(() => {
    console.log('🔄 Manual matches refetch requested');
    hasInitialized.current = false; // Reset to allow fresh load
    return loadMatches(true);
  }, [loadMatches]);

  // Ensure we always return a valid structure with an array
  const safeMatchData = matchData || { matches: [] };
  const safeMatches = Array.isArray(safeMatchData.matches) ? safeMatchData.matches : [];
  
  return {
    matches: { matches: safeMatches },
    isLoading,
    error,
    refetch: refetchData,
  };
}

export function useOfflineMatchDetails(matchId?: string) {
  return useOfflineBase('getMatchDetails', { matchId }, { 
    enabled: !!matchId 
  });
}
