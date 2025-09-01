'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface CaptainOfflineData {
  team: any;
  players: any[];
  matches: any[];
  media: any[];
  communications: any[];
  analytics: any;
}

export interface CaptainPendingAction {
  id: string;
  type: 'team_update' | 'player_invite' | 'media_upload' | 'team_communication' | 'match_result';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface CaptainOfflineContextType {
  isOnline: boolean;
  captainData: CaptainOfflineData;
  pendingActions: CaptainPendingAction[];
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime: Date | null;
  cacheCaptainData: (data: Partial<CaptainOfflineData>) => Promise<void>;
  queueCaptainAction: (action: Omit<CaptainPendingAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
}

const CaptainOfflineContext = createContext<CaptainOfflineContextType | null>(null);

export const CaptainOfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [captainData, setCaptainData] = useState<CaptainOfflineData>({
    team: null,
    players: [],
    matches: [],
    media: [],
    communications: [],
    analytics: null
  });
  const [pendingActions, setPendingActions] = useState<CaptainPendingAction[]>([]);
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

  const cacheCaptainData = async (data: Partial<CaptainOfflineData>) => {
    const newData = { ...captainData, ...data };
    setCaptainData(newData);
    
    if (user?.id) {
      localStorage.setItem(`captain_data_${user.id}`, JSON.stringify(newData));
    }
  };

  const queueCaptainAction = async (action: Omit<CaptainPendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: CaptainPendingAction = {
      ...action,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    const newPendingActions = [...pendingActions, newAction];
    setPendingActions(newPendingActions);

    if (user?.id) {
      localStorage.setItem(`captain_pending_${user.id}`, JSON.stringify(newPendingActions));
    }

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
          await processCaptainAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          action.retryCount++;
        }
      }

      const remainingActions = pendingActions.filter(
        action => !successfulActions.includes(action.id)
      );
      
      setPendingActions(remainingActions);
      
      if (user?.id) {
        localStorage.setItem(`captain_pending_${user.id}`, JSON.stringify(remainingActions));
      }

      setLastSyncTime(new Date());
      setSyncStatus('idle');
      
    } catch (error) {
      console.error('Captain sync failed:', error);
      setSyncStatus('error');
    }
  };

  const processCaptainAction = async (action: CaptainPendingAction) => {
    switch (action.type) {
      case 'team_update':
        // await api.teams.updateTeam.mutate(action.data);
        break;
      case 'player_invite':
        // await api.teams.invitePlayer.mutate(action.data);
        break;
      case 'media_upload':
        // await api.teams.uploadMedia.mutate(action.data);
        break;
      case 'team_communication':
        // await api.teams.sendCommunication.mutate(action.data);
        break;
      case 'match_result':
        // await api.teams.submitMatchResult.mutate(action.data);
        break;
    }
  };

  // Load cached data on mount
  useEffect(() => {
    if (user?.id) {
      const cachedData = localStorage.getItem(`captain_data_${user.id}`);
      const cachedActions = localStorage.getItem(`captain_pending_${user.id}`);
      
      if (cachedData) {
        setCaptainData(JSON.parse(cachedData));
      }
      
      if (cachedActions) {
        setPendingActions(JSON.parse(cachedActions));
      }
    }
  }, [user?.id]);

  const value: CaptainOfflineContextType = {
    isOnline,
    captainData,
    pendingActions,
    syncStatus,
    lastSyncTime,
    cacheCaptainData,
    queueCaptainAction,
    syncPendingActions
  };

  return (
    <CaptainOfflineContext.Provider value={value}>
      {children}
    </CaptainOfflineContext.Provider>
  );
};

export const useCaptainOffline = () => {
  const context = useContext(CaptainOfflineContext);
  if (!context) {
    throw new Error('useCaptainOffline must be used within CaptainOfflineProvider');
  }
  return context;
};
