'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface PlayerOfflineData {
  teams: any[];
  matches: any[];
  profile: any;
  media: any[];
  notifications: any[];
  statistics: any;
}

export interface PlayerPendingAction {
  id: string;
  type: 'profile_update' | 'media_upload' | 'team_response' | 'notification_read';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface PlayerOfflineContextType {
  isOnline: boolean;
  playerData: PlayerOfflineData;
  pendingActions: PlayerPendingAction[];
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime: Date | null;
  cachePlayerData: (data: Partial<PlayerOfflineData>) => Promise<void>;
  queuePlayerAction: (action: Omit<PlayerPendingAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
}

const PlayerOfflineContext = createContext<PlayerOfflineContextType | null>(null);

export const PlayerOfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [playerData, setPlayerData] = useState<PlayerOfflineData>({
    teams: [],
    matches: [],
    profile: null,
    media: [],
    notifications: [],
    statistics: null
  });
  const [pendingActions, setPendingActions] = useState<PlayerPendingAction[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline]);

  const cachePlayerData = async (data: Partial<PlayerOfflineData>) => {
    const newData = { ...playerData, ...data };
    setPlayerData(newData);
    
    // Store in localStorage for persistence
    if (user?.id) {
      localStorage.setItem(`player_data_${user.id}`, JSON.stringify(newData));
    }
  };

  const queuePlayerAction = async (action: Omit<PlayerPendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: PlayerPendingAction = {
      ...action,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    const newPendingActions = [...pendingActions, newAction];
    setPendingActions(newPendingActions);

    // Store in localStorage
    if (user?.id) {
      localStorage.setItem(`player_pending_${user.id}`, JSON.stringify(newPendingActions));
    }

    // Try to sync immediately if online
    if (isOnline) {
      syncPendingActions();
    }
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;

    setSyncStatus('syncing');
    
    try {
      const successfulActions: string[] = [];
      
      for (const action of pendingActions) {
        try {
          // Process each action based on type
          await processPlayerAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Increment retry count
          action.retryCount++;
        }
      }

      // Remove successful actions
      const remainingActions = pendingActions.filter(
        action => !successfulActions.includes(action.id)
      );
      
      setPendingActions(remainingActions);
      
      if (user?.id) {
        localStorage.setItem(`player_pending_${user.id}`, JSON.stringify(remainingActions));
      }

      setLastSyncTime(new Date());
      setSyncStatus('idle');
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  const processPlayerAction = async (action: PlayerPendingAction) => {
    // Mock implementation - replace with actual API calls
    switch (action.type) {
      case 'profile_update':
        // await api.players.updateProfile.mutate(action.data);
        break;
      case 'media_upload':
        // await api.players.uploadMedia.mutate(action.data);
        break;
      case 'team_response':
        // await api.players.respondToTeam.mutate(action.data);
        break;
      case 'notification_read':
        // await api.players.markNotificationRead.mutate(action.data);
        break;
    }
  };

  // Load cached data on mount
  useEffect(() => {
    if (user?.id) {
      const cachedData = localStorage.getItem(`player_data_${user.id}`);
      const cachedActions = localStorage.getItem(`player_pending_${user.id}`);
      
      if (cachedData) {
        setPlayerData(JSON.parse(cachedData));
      }
      
      if (cachedActions) {
        setPendingActions(JSON.parse(cachedActions));
      }
    }
  }, [user?.id]);

  const value: PlayerOfflineContextType = {
    isOnline,
    playerData,
    pendingActions,
    syncStatus,
    lastSyncTime,
    cachePlayerData,
    queuePlayerAction,
    syncPendingActions
  };

  return (
    <PlayerOfflineContext.Provider value={value}>
      {children}
    </PlayerOfflineContext.Provider>
  );
};

export const usePlayerOffline = () => {
  const context = useContext(PlayerOfflineContext);
  if (!context) {
    throw new Error('usePlayerOffline must be used within PlayerOfflineProvider');
  }
  return context;
};
