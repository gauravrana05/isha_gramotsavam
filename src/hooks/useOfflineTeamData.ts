'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTeamsStorage, TeamRecord, TeamPlayerRecord } from '@/lib/services/offline/teamsStorage';

interface TeamOfflineData {
  team: TeamRecord | null;
  players: TeamPlayerRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useOfflineTeamData(teamId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<TeamOfflineData>({
    team: null,
    players: [],
    isLoading: true,
    error: null
  });

  const loadTeamData = useCallback(async () => {
    if (!teamId) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getTeamsStorage();
      const team = await storage.getTeam(teamId);
      
      setData(prev => ({
        ...prev,
        team,
        players: team?.data.teamPlayers || [],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading team data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load team data'
      }));
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId, loadTeamData]);

  return {
    ...data,
    refresh: loadTeamData
  };
}
