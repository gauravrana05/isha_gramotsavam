import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

export interface VenueData {
  venue: any;
  stats: any;
  teams: any[];
  matches: any[];
  fixtures: any[];
}

/**
 * Hook for managing venue data with offline-first approach and API fallback
 */
export function useOfflineVenueData(venueId?: string) {
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const hasInitialized = React.useRef(false);

  // Stabilize userId to prevent infinite loops
  const stableUserId = React.useMemo(() => user?.id, [user?.id]);

  // API fallback for teams
  const { data: apiTeams } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId! },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  // API fallback for fixtures
  const { data: apiFixtures } = api.volunteers.venue.getVenueFixtures.useQuery(
    { venueId: venueId! },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  const loadVenueData = useCallback(async (force = false) => {
    if (!venueId || !stableUserId) {
      setIsLoading(false);
      return;
    }

    // Check if data already exists and is fresh (within 5 minutes) - only if not forced
    if (!force && hasInitialized.current) {
      const now = Date.now();
      const isDataFresh = venueData && lastFetchTime && (now - lastFetchTime) < 5 * 60 * 1000;
      
      if (venueData && isDataFresh) {
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      
      // Try offline storage first
      let venue, teams, fixtures;
      
      try {
        [venue, teams, fixtures] = await Promise.all([
          service.getVenueDetails(venueId, stableUserId),
          service.getTeamsForVenue(venueId, stableUserId),
          service.getVenueFixtures(venueId, stableUserId),
        ]);
      } catch (offlineError) {
        // Offline storage empty, will use API fallback
      }

      // Use offline data if available
      const teamsData = teams?.map(t => t.data || t) || [];
      const fixturesData = fixtures?.map(f => f.data || f) || [];
      
      if (teamsData.length > 0 || fixturesData.length > 0) {
        const stats = {
          totalTeams: teamsData.length,
          checkedInTeams: teamsData.filter(t => t.status === 'checked_in').length,
          totalFixtures: fixturesData.length,
          completedFixtures: fixturesData.filter(f => f.status === 'completed').length,
        };

        setVenueData({
          venue,
          teams: teamsData,
          fixtures: fixturesData,
          matches: [],
          stats,
        });
        setLastFetchTime(Date.now());
        hasInitialized.current = true;
      } else {
        // No offline data - set empty data and let API fallback handle it
        setVenueData({
          venue: null,
          teams: [],
          fixtures: [],
          matches: [],
          stats: { totalTeams: 0, checkedInTeams: 0, totalFixtures: 0, completedFixtures: 0 }
        });
        setLastFetchTime(Date.now());
        hasInitialized.current = true;
      }
      
    } catch (err) {
      setError(err as Error);
      // Set empty data on error to prevent UI hanging
      setVenueData({
        venue: null,
        teams: [],
        fixtures: [],
        matches: [],
        stats: { totalTeams: 0, checkedInTeams: 0, totalFixtures: 0, completedFixtures: 0 }
      });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [venueId, stableUserId]);

  // Initial load effect - only runs once when dependencies change
  useEffect(() => {
    if (!hasInitialized.current) {
      loadVenueData();
    }
  }, [loadVenueData]);

  // API fallback effect - handles API data when offline data is not available
  // FIXED: Stabilize dependencies and ensure loading is set to false
  useEffect(() => {
    // Only run if we have API data and no venue data yet
    if ((apiTeams?.length || apiFixtures?.length) && hasInitialized.current && venueData && venueData.teams.length === 0 && venueData.fixtures.length === 0) {
      const teamsData = apiTeams?.map(t => ({ ...t })) || [];
      const fixturesData = apiFixtures?.map(f => ({ ...f })) || [];
      
      const stats = {
        totalTeams: teamsData.length,
        checkedInTeams: teamsData.filter(t => t.status === 'checked_in').length,
        totalFixtures: fixturesData.length,
        completedFixtures: fixturesData.filter(f => f.status === 'completed').length,
      };

      setVenueData({
        venue: null,
        teams: teamsData,
        fixtures: fixturesData,
        matches: [],
        stats,
      });
      setLastFetchTime(Date.now());
      setIsLoading(false); // FIXED: Ensure loading is set to false
    }
  }, [apiTeams?.length, apiFixtures?.length, hasInitialized.current]); // FIXED: Stable dependencies

  // Manual refetch function that forces a refresh
  const refetch = useCallback(() => {
    hasInitialized.current = false; // Reset to allow fresh load
    return loadVenueData(true);
  }, [loadVenueData]);

  // Ensure we always return a valid structure
  const safeVenueData = venueData || {
    venue: null,
    teams: [],
    fixtures: [],
    matches: [],
    stats: { totalTeams: 0, checkedInTeams: 0, totalFixtures: 0, completedFixtures: 0 }
  };

  return {
    venueData: safeVenueData,
    isLoading,
    error,
    refetch,
    // Specific data accessors for backward compatibility
    venue: safeVenueData.venue,
    stats: safeVenueData.stats,
    teams: safeVenueData.teams,
    fixtures: safeVenueData.fixtures,
    matches: safeVenueData.matches,
  };
}
