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
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime: Date | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  syncProgress: number;
  cachePlayerData: (data: Partial<PlayerOfflineData>) => Promise<void>;
  queuePlayerAction: (action: Omit<PlayerPendingAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearCache: () => Promise<void>;
  optimizeStorage: () => Promise<void>;
  getStorageStats: () => Promise<{ totalSize: number; teamCount: number; actionCount: number }>;
  registerBackgroundSync: (tag: string) => Promise<void>;
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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('good');
  const [syncProgress, setSyncProgress] = useState(0);

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
    try {
      // Import API utilities dynamically to avoid circular dependencies
      const { api } = await import('@/server/trpc/react');
      
      switch (action.type) {
        case 'profile_update':
          // Implement profile update API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/profile.updateProfile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Profile update failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Profile update synced:', result);
          }
          break;
          
        case 'media_upload':
          // Implement media upload API call
          if (typeof window !== 'undefined') {
            const formData = new FormData();
            
            // Handle file upload data
            if (action.data.file) {
              formData.append('media', action.data.file);
            }
            if (action.data.metadata) {
              formData.append('metadata', JSON.stringify(action.data.metadata));
            }
            
            const response = await fetch('/api/upload-media', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`Media upload failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Media upload synced:', result);
          }
          break;
          
        case 'team_response':
          // Implement team response API call (accept/decline team invitation)
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/teams.respondToInvitation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Team response failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Team response synced:', result);
          }
          break;
          
        case 'notification_read':
          // Implement notification read status API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/notifications.markAsRead', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Mark notification read failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Notification marked as read synced:', result);
          }
          break;
          
        default:
          console.warn('⚠️ Unknown player action type:', action.type);
          break;
      }
    } catch (error) {
      console.error('❌ Player action processing failed:', error);
      throw error;
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

  // Enhanced connection quality detection
  const detectConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        setConnectionQuality('poor');
        return;
      }

      if (latency < 100) setConnectionQuality('excellent');
      else if (latency < 300) setConnectionQuality('good');
      else if (latency < 1000) setConnectionQuality('fair');
      else setConnectionQuality('poor');
    } catch (error) {
      setConnectionQuality('offline');
    }
  }, []);

  // Clear cache method
  const clearCache = useCallback(async () => {
    try {
      setPlayerData({
        teams: [],
        matches: [],
        profile: null,
        media: [],
        notifications: [],
        statistics: null
      });
      setPendingActions([]);

      if (user?.id) {
        localStorage.removeItem(`player_data_${user.id}`);
        localStorage.removeItem(`player_pending_${user.id}`);
      }

      console.log('✅ Player cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear player cache:', error);
      throw error;
    }
  }, [user?.id]);

  // Storage optimization
  const optimizeStorage = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      setSyncProgress(0);

      // Clean up old pending actions (older than 7 days)
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const filteredActions = pendingActions.filter(action => action.timestamp > oneWeekAgo);
      
      setSyncProgress(30);

      // Clean up old cached data
      const optimizedData = {
        ...playerData,
        // Keep only recent media (last 30 days)
        media: playerData.media.slice(-50), // Keep last 50 media items
        notifications: playerData.notifications.slice(-100), // Keep last 100 notifications
      };

      setSyncProgress(60);

      // Update storage
      setPlayerData(optimizedData);
      setPendingActions(filteredActions);

      if (user?.id) {
        localStorage.setItem(`player_data_${user.id}`, JSON.stringify(optimizedData));
        localStorage.setItem(`player_pending_${user.id}`, JSON.stringify(filteredActions));
      }

      setSyncProgress(100);
      setSyncStatus('success');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
      console.log('✅ Player storage optimized successfully');
    } catch (error) {
      console.error('❌ Player storage optimization failed:', error);
      setSyncStatus('error');
      throw error;
    }
  }, [playerData, pendingActions, user?.id]);

  // Get storage stats
  const getStorageStats = useCallback(async () => {
    try {
      const dataSize = JSON.stringify(playerData).length;
      const actionsSize = JSON.stringify(pendingActions).length;
      
      return {
        totalSize: dataSize + actionsSize,
        teamCount: playerData.teams.length,
        actionCount: pendingActions.length,
      };
    } catch (error) {
      console.error('❌ Failed to get player storage stats:', error);
      return { totalSize: 0, teamCount: 0, actionCount: 0 };
    }
  }, [playerData, pendingActions]);

  // Background sync registration
  const registerBackgroundSync = useCallback(async (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`player-${tag}`);
        console.log('🔄 Player background sync registered:', tag);
      } catch (error) {
        console.error('❌ Failed to register player background sync:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ Background sync not supported for player');
    }
  }, []);

  // Enhanced sync with progress tracking
  const enhancedSyncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return;

    setSyncStatus('syncing');
    setSyncProgress(0);
    
    try {
      const total = pendingActions.length;
      const successfulActions: string[] = [];
      
      for (let i = 0; i < pendingActions.length; i++) {
        const action = pendingActions[i];
        setSyncProgress(Math.round((i / total) * 100));
        
        try {
          await processPlayerAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error(`❌ Failed to sync player action ${action.id}:`, error);
          action.retryCount++;
        }
      }

      const remainingActions = pendingActions.filter(
        action => !successfulActions.includes(action.id)
      );
      
      setPendingActions(remainingActions);
      
      if (user?.id) {
        localStorage.setItem(`player_pending_${user.id}`, JSON.stringify(remainingActions));
      }

      setSyncProgress(100);
      setLastSyncTime(new Date());
      setSyncStatus('success');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
      
    } catch (error) {
      console.error('❌ Player sync failed:', error);
      setSyncStatus('error');
    }
  }, [isOnline, pendingActions, user?.id]);

  // Enhanced network monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      detectConnectionQuality();
      if (pendingActions.length > 0) {
        setTimeout(() => enhancedSyncPendingActions(), 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection check
    detectConnectionQuality();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [detectConnectionQuality, pendingActions.length, enhancedSyncPendingActions]);

  const value: PlayerOfflineContextType = {
    isOnline,
    playerData,
    pendingActions,
    syncStatus,
    lastSyncTime,
    connectionQuality,
    syncProgress,
    cachePlayerData,
    queuePlayerAction,
    syncPendingActions: enhancedSyncPendingActions,
    clearCache,
    optimizeStorage,
    getStorageStats,
    registerBackgroundSync
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
