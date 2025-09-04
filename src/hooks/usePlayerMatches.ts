'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMatchesStorage, MatchRecord } from '@/lib/services/offline/matchesStorage';

interface PlayerMatchesData {
  myUpcomingMatches: MatchRecord[];
  myLiveMatches: MatchRecord[];
  myRecentMatches: MatchRecord[];
  allLiveMatches: MatchRecord[];
  isLoading: boolean;
  error: string | null;
}

export function usePlayerMatches(teamIds: string[] = []) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerMatchesData>({
    myUpcomingMatches: [],
    myLiveMatches: [],
    myRecentMatches: [],
    allLiveMatches: [],
    isLoading: true,
    error: null
  });

  const loadMatchesData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getMatchesStorage();
      
      // Get all live matches for general viewing
      const allLiveMatches = await storage.getLiveMatches();
      
      if (teamIds.length === 0) {
        setData(prev => ({
          ...prev,
          myUpcomingMatches: [],
          myLiveMatches: [],
          myRecentMatches: [],
          allLiveMatches,
          isLoading: false
        }));
        return;
      }

      // Get matches for player's teams
      const teamMatchesPromises = teamIds.map(teamId => storage.getMatchesByTeam(teamId));
      const teamMatchesArrays = await Promise.all(teamMatchesPromises);
      
      // Flatten and deduplicate matches
      const allMyMatches = teamMatchesArrays.flat();
      const uniqueMatches = allMyMatches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );
      
      const myLiveMatches = uniqueMatches.filter(m => m.data.status === 'live');
      const myUpcomingMatches = uniqueMatches
        .filter(m => m.data.status === 'scheduled')
        .sort((a, b) => new Date(a.data.scheduledTime).getTime() - new Date(b.data.scheduledTime).getTime());
      const myRecentMatches = uniqueMatches
        .filter(m => m.data.status === 'completed')
        .sort((a, b) => new Date(b.data.completedAt || b.data.scheduledTime).getTime() - new Date(a.data.completedAt || a.data.scheduledTime).getTime())
        .slice(0, 5);

      setData(prev => ({
        ...prev,
        myUpcomingMatches,
        myLiveMatches,
        myRecentMatches,
        allLiveMatches,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading player matches:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load matches data'
      }));
    }
  }, [teamIds]);

  useEffect(() => {
    loadMatchesData();
  }, [loadMatchesData]);

  return {
    ...data,
    refresh: loadMatchesData
  };
}
