'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMatchesStorage, MatchRecord } from '@/lib/services/offline/matchesStorage';

interface CaptainMatchesData {
  liveMatches: MatchRecord[];
  upcomingMatches: MatchRecord[];
  recentMatches: MatchRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useCaptainMatches(teamId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<CaptainMatchesData>({
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    isLoading: true,
    error: null
  });

  const loadMatchesData = useCallback(async () => {
    if (!teamId) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getMatchesStorage();
      const teamMatches = await storage.getMatchesByTeam(teamId);
      
      const liveMatches = teamMatches.filter(m => m.data.status === 'live');
      const upcomingMatches = teamMatches
        .filter(m => m.data.status === 'scheduled')
        .sort((a, b) => new Date(a.data.scheduledTime).getTime() - new Date(b.data.scheduledTime).getTime());
      const recentMatches = teamMatches
        .filter(m => m.data.status === 'completed')
        .sort((a, b) => new Date(b.data.completedAt || b.data.scheduledTime).getTime() - new Date(a.data.completedAt || a.data.scheduledTime).getTime())
        .slice(0, 5);

      setData(prev => ({
        ...prev,
        liveMatches,
        upcomingMatches,
        recentMatches,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading captain matches:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load matches data'
      }));
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadMatchesData();
    }
  }, [teamId, loadMatchesData]);

  return {
    ...data,
    refresh: loadMatchesData
  };
}
