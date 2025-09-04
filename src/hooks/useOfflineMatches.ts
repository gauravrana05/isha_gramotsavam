'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMatchesStorage, MatchRecord } from '@/lib/services/offline/matchesStorage';

interface MatchesOfflineData {
  liveMatches: MatchRecord[];
  upcomingMatches: MatchRecord[];
  recentMatches: MatchRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useOfflineMatches(teamId?: string, venueId?: string) {
  const [data, setData] = useState<MatchesOfflineData>({
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    isLoading: true,
    error: null
  });

  const loadMatchesData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getMatchesStorage();
      
      let liveMatches: MatchRecord[] = [];
      let upcomingMatches: MatchRecord[] = [];
      let recentMatches: MatchRecord[] = [];

      if (teamId) {
        // Get matches for specific team
        const teamMatches = await storage.getMatchesByTeam(teamId);
        liveMatches = teamMatches.filter(m => m.data.status === 'live');
        upcomingMatches = teamMatches.filter(m => m.data.status === 'scheduled');
        recentMatches = teamMatches.filter(m => m.data.status === 'completed');
      } else if (venueId) {
        // Get matches for specific venue
        const venueMatches = await storage.getMatchesByVenue(venueId);
        liveMatches = venueMatches.filter(m => m.data.status === 'live');
        upcomingMatches = venueMatches.filter(m => m.data.status === 'scheduled');
        recentMatches = venueMatches.filter(m => m.data.status === 'completed');
      } else {
        // Get all matches
        liveMatches = await storage.getLiveMatches();
        upcomingMatches = await storage.getUpcomingMatches(10);
        // Recent matches would need a separate method
      }

      setData(prev => ({
        ...prev,
        liveMatches,
        upcomingMatches,
        recentMatches: recentMatches.slice(0, 5), // Limit recent matches
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading matches data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load matches data'
      }));
    }
  }, [teamId, venueId]);

  useEffect(() => {
    loadMatchesData();
  }, [loadMatchesData]);

  return {
    ...data,
    refresh: loadMatchesData
  };
}

// Export role-specific hooks for mobile use
export { useCaptainMatches } from './useCaptainMatches';
export { usePlayerMatches } from './usePlayerMatches';
