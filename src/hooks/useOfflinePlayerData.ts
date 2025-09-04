'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PlayerOfflineService, PlayerTeamData, PlayerMatchData, PlayerNotificationData } from '@/lib/services/offline/playerService';
import { api } from '@/server/trpc/react';

interface PlayerOfflineData {
  teams: PlayerTeamData[];
  primaryTeam: PlayerTeamData | null;
  upcomingMatches: PlayerMatchData[];
  notifications: PlayerNotificationData[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

export function useOfflinePlayerData() {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerOfflineData>({
    teams: [],
    primaryTeam: null,
    upcomingMatches: [],
    notifications: [],
    isLoading: true,
    error: null,
    lastSyncTime: null
  });

  const [service, setService] = useState<PlayerOfflineService | null>(null);

  // Initialize service
  useEffect(() => {
    if (user?.id && user.role === 'player') {
      const playerService = new PlayerOfflineService(user.id);
      setService(playerService);
    }
  }, [user]);

  // Load offline data
  const loadOfflineData = useCallback(async () => {
    if (!service) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const [teams, upcomingMatches, notifications] = await Promise.all([
        service.getMyTeams(),
        service.getMyUpcomingMatches(5),
        service.getMyNotifications()
      ]);

      const primaryTeam = teams[0] || null;

      setData(prev => ({
        ...prev,
        teams,
        primaryTeam,
        upcomingMatches,
        notifications,
        isLoading: false,
        lastSyncTime: new Date()
      }));
    } catch (error) {
      console.error('Error loading offline player data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load offline data'
      }));
    }
  }, [service]);

  // Sync with server
  const { refetch: syncPlayerTeams } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { 
      enabled: false, // Manual trigger only
      onSuccess: async (serverData) => {
        if (service && serverData) {
          try {
            // Update offline storage with server data
            // Note: This would need proper mapping from server data structure
            await loadOfflineData();
          } catch (error) {
            console.error('Error syncing player data:', error);
          }
        }
      }
    }
  );

  // Notification actions
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!service) throw new Error('Service not initialized');

    try {
      await service.markNotificationAsRead(notificationId);
      await loadOfflineData(); // Refresh local data
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [service, loadOfflineData]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!service) throw new Error('Service not initialized');

    try {
      const unreadNotifications = data.notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification => 
          service.markNotificationAsRead(notification.id)
        )
      );
      
      await loadOfflineData(); // Refresh local data
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, [service, data.notifications, loadOfflineData]);

  // Profile actions
  const updateProfile = useCallback(async (profileData: any) => {
    if (!service) throw new Error('Service not initialized');

    try {
      await service.updateProfile(profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [service]);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    try {
      await syncPlayerTeams();
    } catch (error) {
      console.error('Error syncing with server:', error);
      setData(prev => ({
        ...prev,
        error: 'Failed to sync with server'
      }));
    }
  }, [syncPlayerTeams]);

  // Load data on service initialization
  useEffect(() => {
    if (service) {
      loadOfflineData();
    }
  }, [service, loadOfflineData]);

  // Preload data
  useEffect(() => {
    if (service) {
      service.preloadPlayerData().catch(console.error);
    }
  }, [service]);

  return {
    ...data,
    actions: {
      markNotificationAsRead,
      markAllNotificationsAsRead,
      updateProfile,
      syncWithServer,
      refresh: loadOfflineData
    }
  };
}
