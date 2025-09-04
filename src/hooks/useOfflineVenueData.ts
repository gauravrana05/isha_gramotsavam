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
  console.log('🔧 [useOfflineVenueData] Hook called with venueId:', venueId);
  
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const hasInitialized = React.useRef(false);
  
  // Circuit breaker to prevent infinite loops
  const loadAttempts = React.useRef(0);
  const lastLoadAttemptTime = React.useRef(0);

  console.log('🔧 [useOfflineVenueData] Current state:', {
    venueId,
    userId: user?.id,
    isLoading,
    hasVenueData: !!venueData,
    hasInitialized: hasInitialized.current,
    lastFetchTime,
    loadAttempts: loadAttempts.current
  });

  // Stabilize userId to prevent infinite loops
  const stableUserId = React.useMemo(() => {
    console.log('🔧 [useOfflineVenueData] stableUserId updated:', user?.id);
    return user?.id;
  }, [user?.id]);

  // Removed teams API query - teams are now handled by useOfflineTeams hook

  // API fallback for fixtures
  const { data: apiFixtures } = api.volunteers.venue.getVenueFixtures.useQuery(
    { venueId: venueId! },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  const loadVenueData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Circuit breaker: prevent excessive loading attempts
    if (loadAttempts.current > 5 && (now - lastLoadAttemptTime.current) < 5000) {
      console.warn('🚨 [useOfflineVenueData] Circuit breaker triggered - too many load attempts');
      setIsLoading(false);
      setError(new Error('Too many load attempts, circuit breaker activated'));
      return;
    }
    
    loadAttempts.current++;
    lastLoadAttemptTime.current = now;
    
    console.log('🔧 [useOfflineVenueData] loadVenueData called:', { venueId, stableUserId, force, hasInitialized: hasInitialized.current, loadAttempt: loadAttempts.current });
    
    if (!venueId || !stableUserId) {
      console.log('🔧 [useOfflineVenueData] Missing venueId or userId, stopping');
      setIsLoading(false);
      return;
    }

    // Check if data already exists and is fresh (within 5 minutes) - only if not forced
    if (!force && hasInitialized.current) {
      const now = Date.now();
      const isDataFresh = venueData && lastFetchTime && (now - lastFetchTime) < 5 * 60 * 1000;
      
      console.log('🔧 [useOfflineVenueData] Freshness check:', { hasVenueData: !!venueData, lastFetchTime, isDataFresh });
      
      if (venueData && isDataFresh) {
        console.log('🔧 [useOfflineVenueData] Data is fresh, skipping load');
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log('🔧 [useOfflineVenueData] Starting load process');
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      console.log('🔧 [useOfflineVenueData] Got volunteer service');
      
      // Try offline storage first (venue and fixtures only - teams handled separately)
      let venue, fixtures;
      
      try {
        console.log('🔧 [useOfflineVenueData] Trying offline storage');
        [venue, fixtures] = await Promise.all([
          service.getVenueDetails(venueId, stableUserId),
          service.getVenueFixtures(venueId, stableUserId),
        ]);
        console.log('🔧 [useOfflineVenueData] Offline storage result:', { venue: !!venue, fixtures: fixtures?.length });
      } catch (offlineError) {
        console.log('🔧 [useOfflineVenueData] Offline storage failed:', offlineError);
        // Offline storage empty, will use API fallback
      }

      // Use offline data if available (no teams stats since teams handled separately)
      const fixturesData = fixtures?.map(f => f.data || f) || [];
      
      const stats = {
        totalFixtures: fixturesData.length,
        completedFixtures: fixturesData.filter(f => f.status === 'completed').length,
      };

      console.log('🔧 [useOfflineVenueData] Setting venue data:', { venue: !!venue, fixturesCount: fixturesData.length, stats });
      
      setVenueData({
        venue,
        teams: [], // Always empty - teams handled by useOfflineTeams
        fixtures: fixturesData,
        matches: [],
        stats,
      });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
      
      console.log('🔧 [useOfflineVenueData] Load completed successfully');
      
    } catch (err) {
      console.log('🔧 [useOfflineVenueData] Load failed with error:', err);
      setError(err as Error);
      // Set empty data on error to prevent UI hanging
      setVenueData({
        venue: null,
        teams: [],
        fixtures: [],
        matches: [],
        stats: { totalFixtures: 0, completedFixtures: 0 }
      });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
    } finally {
      console.log('🔧 [useOfflineVenueData] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [venueId, stableUserId]);

  // Initial load effect - stable dependencies to prevent loops
  useEffect(() => {
    console.log('🔧 [useOfflineVenueData] Initial load effect triggered:', { hasInitialized: hasInitialized.current, venueId, stableUserId });
    if (!hasInitialized.current && venueId && stableUserId) {
      console.log('🔧 [useOfflineVenueData] Calling loadVenueData from useEffect');
      loadVenueData();
    }
  }, [venueId, stableUserId]); // FIXED: Only stable dependencies, removed loadVenueData

  // API fallback effect - handles fixtures API data when offline data is not available
  useEffect(() => {
    console.log('🔧 [useOfflineVenueData] API fallback effect triggered:', {
      apiFixturesLength: apiFixtures?.length,
      hasVenueData: !!venueData,
      venueDataFixturesLength: venueData?.fixtures?.length,
      hasInitialized: hasInitialized.current
    });
    
    // Only run if we have fixtures API data and haven't already initialized
    if (apiFixtures?.length && 
        (!venueData || venueData.fixtures.length === 0) &&
        !hasInitialized.current) {
      console.log('🔧 [useOfflineVenueData] Using API fallback data');
      
      const fixturesData = apiFixtures?.map(f => ({ ...f })) || [];
      
      const stats = {
        totalFixtures: fixturesData.length,
        completedFixtures: fixturesData.filter(f => f.status === 'completed').length,
      };

      setVenueData({
        venue: null,
        teams: [], // Always empty - teams handled by useOfflineTeams
        fixtures: fixturesData,
        matches: [],
        stats,
      });
      setLastFetchTime(Date.now());
      hasInitialized.current = true;
      setIsLoading(false);
      
      console.log('🔧 [useOfflineVenueData] API fallback completed');
    } else {
      console.log('🔧 [useOfflineVenueData] API fallback conditions not met');
    }
  }, [apiFixtures]); // FIXED: Only depend on apiFixtures array reference

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
    stats: { totalFixtures: 0, completedFixtures: 0 }
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
