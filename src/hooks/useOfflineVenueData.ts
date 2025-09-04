import { useOfflineBase } from './useOfflineBase';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { api } from '@/server/trpc/react';

export interface VenueData {
  venue: any;
  stats: any;
  teams: any[];
  matches: any[];
  fixtures: any[];
}

export function useOfflineVenueData(venueId?: string) {
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadVenueData = useCallback(async () => {
    if (!venueId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent endless loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Venue data loading timeout')), 10000);
      });

      const dataPromise = (async () => {
        const service = getVolunteerService();
        
        // Ensure service is initialized before proceeding
        await service.initialize(user.id);
        
        // Load all venue-related data from offline storage with individual error handling
        const [venue, stats, teams, matches, fixtures] = await Promise.allSettled([
          service.getVenueDetails(venueId, user.id),
          service.getVenueStats(venueId, user.id),
          service.getVenueTeams(venueId, user.id),
          service.getVenueMatches(venueId, user.id),
          service.getVenueFixtures(venueId, user.id),
        ]);

        // Extract data from settled promises, handling failures gracefully
        const structuredData = {
          venue: venue.status === 'fulfilled' ? venue.value : null,
          stats: stats.status === 'fulfilled' ? stats.value : { totalTeams: 0, matchesCompleted: 0, matchesTotal: 0, progress: 0 },
          teams: teams.status === 'fulfilled' ? teams.value || [] : [],
          matches: matches.status === 'fulfilled' ? matches.value || [] : [],
          fixtures: fixtures.status === 'fulfilled' ? fixtures.value || [] : [],
        };

        // Add computed properties for fixtures page compatibility
        structuredData.tournament = structuredData.fixtures[0] || null;
        structuredData.teamsBySport = structuredData.teams || [];

        return structuredData;
      })();

      const result = await Promise.race([dataPromise, timeoutPromise]);
      setVenueData(result);
      
    } catch (err) {
      console.error('Failed to load venue data:', err);
      setError(err as Error);
      // Set empty data to prevent UI from hanging
      setVenueData({
        venue: null,
        stats: { totalTeams: 0, matchesCompleted: 0, matchesTotal: 0, progress: 0 },
        teams: [],
        matches: [],
        fixtures: [],
        tournament: null,
        teamsBySport: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

  return {
    // Main data object (matches API structure)
    venueData,
    
    // Individual properties for convenience
    venue: venueData?.venue,
    stats: venueData?.stats,
    teams: venueData?.teams || [],
    matches: venueData?.matches || [],
    fixtures: venueData?.fixtures || [],
    
    // States
    isLoading,
    error,
    refetch: loadVenueData,
  };
}

// Specific venue hooks for granular access
export function useOfflineVenueDetails(venueId?: string) {
  return useOfflineBase('getVenueDetails', { venueId }, { 
    enabled: !!venueId 
  });
}

export function useOfflineVenueStats(venueId?: string) {
  return useOfflineBase('getVenueStats', { venueId }, { 
    enabled: !!venueId 
  });
}
