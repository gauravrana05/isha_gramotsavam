'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CaptainOfflineService, CaptainTeamData, CaptainPlayerData, CaptainMatchData } from '@/lib/services/offline/captainService';
import { api } from '@/server/trpc/react';

interface CaptainOfflineData {
  team: CaptainTeamData | null;
  players: CaptainPlayerData[];
  upcomingMatches: CaptainMatchData[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

export function useOfflineCaptainData() {
  const { user } = useAuth();
  const [data, setData] = useState<CaptainOfflineData>({
    team: null,
    players: [],
    upcomingMatches: [],
    isLoading: true,
    error: null,
    lastSyncTime: null
  });

  const [service, setService] = useState<CaptainOfflineService | null>(null);

  // Initialize service
  useEffect(() => {
    if (user?.id && user.role === 'captain') {
      const captainService = new CaptainOfflineService(user.id);
      setService(captainService);
    }
  }, [user]);

  // Load offline data
  const loadOfflineData = useCallback(async () => {
    if (!service) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const [team, players, upcomingMatches] = await Promise.all([
        service.getMyTeam(),
        service.getTeamPlayers(),
        service.getUpcomingMatches(5)
      ]);

      setData(prev => ({
        ...prev,
        team,
        players,
        upcomingMatches,
        isLoading: false,
        lastSyncTime: new Date()
      }));
    } catch (error) {
      console.error('Error loading offline captain data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load offline data'
      }));
    }
  }, [service]);

  // Sync with server
  const { refetch: syncTeamData } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { 
      enabled: false, // Manual trigger only
      onSuccess: async (serverData) => {
        if (service && serverData) {
          try {
            // Update offline storage with server data
            await service.updateTeam({
              teamId: serverData.id,
              name: serverData.name,
              sport: serverData.sport?.name || '',
              status: serverData.status,
              currentPlayers: serverData.currentPlayers,
              maxPlayers: 15, // Default max
              captainId: serverData.captainId,
              venueId: serverData.venueId || undefined
            });

            // Reload offline data
            await loadOfflineData();
          } catch (error) {
            console.error('Error syncing team data:', error);
          }
        }
      }
    }
  );

  // Team management actions
  const addPlayer = useCallback(async (playerData: CaptainPlayerData) => {
    if (!service) throw new Error('Service not initialized');

    try {
      await service.addPlayer(playerData);
      await loadOfflineData(); // Refresh local data
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }, [service, loadOfflineData]);

  const removePlayer = useCallback(async (playerId: string) => {
    if (!service) throw new Error('Service not initialized');

    try {
      await service.removePlayer(playerId);
      await loadOfflineData(); // Refresh local data
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }, [service, loadOfflineData]);

  const updateTeam = useCallback(async (teamData: Partial<CaptainTeamData>) => {
    if (!service) throw new Error('Service not initialized');

    try {
      await service.updateTeam(teamData);
      await loadOfflineData(); // Refresh local data
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }, [service, loadOfflineData]);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    try {
      await syncTeamData();
    } catch (error) {
      console.error('Error syncing with server:', error);
      setData(prev => ({
        ...prev,
        error: 'Failed to sync with server'
      }));
    }
  }, [syncTeamData]);

  // Load data on service initialization
  useEffect(() => {
    if (service) {
      loadOfflineData();
    }
  }, [service, loadOfflineData]);

  // Preload data
  useEffect(() => {
    if (service) {
      service.preloadCaptainData().catch(console.error);
    }
  }, [service]);

  return {
    ...data,
    actions: {
      addPlayer,
      removePlayer,
      updateTeam,
      syncWithServer,
      refresh: loadOfflineData
    }
  };
}
