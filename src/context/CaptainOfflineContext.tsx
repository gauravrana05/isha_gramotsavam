'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime: Date | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  syncProgress: number;
  cacheCaptainData: (data: Partial<CaptainOfflineData>) => Promise<void>;
  queueCaptainAction: (action: Omit<CaptainPendingAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearCache: () => Promise<void>;
  optimizeStorage: () => Promise<void>;
  getStorageStats: () => Promise<{ totalSize: number; teamCount: number; actionCount: number }>;
  registerBackgroundSync: (tag: string) => Promise<void>;
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
    try {
      // Import API utilities dynamically to avoid circular dependencies
      const { api } = await import('@/server/trpc/react');
      
      switch (action.type) {
        case 'team_update':
          // Implement team update API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/teams.updateTeam', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Team update failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Team update synced:', result);
          }
          break;
          
        case 'player_invite':
          // Implement player invitation API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/teams.invitePlayer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Player invite failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Player invite synced:', result);
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
          
        case 'team_communication':
          // Implement team communication API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/teams.sendCommunication', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Team communication failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Team communication synced:', result);
          }
          break;
          
        case 'match_result':
          // Implement match result submission API call
          if (typeof window !== 'undefined') {
            const response = await fetch('/api/trpc/matches.submitResult', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
            
            if (!response.ok) {
              throw new Error(`Match result submission failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Match result synced:', result);
          }
          break;
          
        default:
          console.warn('⚠️ Unknown captain action type:', action.type);
          break;
      }
    } catch (error) {
      console.error('❌ Captain action processing failed:', error);
      throw error;
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
      setCaptainData({
        team: null,
        players: [],
        matches: [],
        media: [],
        communications: [],
        analytics: null
      });
      setPendingActions([]);

      if (user?.id) {
        localStorage.removeItem(`captain_data_${user.id}`);
        localStorage.removeItem(`captain_pending_${user.id}`);
      }

      console.log('✅ Captain cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear captain cache:', error);
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
        ...captainData,
        // Keep only recent media (last 30 days)
        media: captainData.media.slice(-50), // Keep last 50 media items
        communications: captainData.communications.slice(-100), // Keep last 100 communications
      };

      setSyncProgress(60);

      // Update storage
      setCaptainData(optimizedData);
      setPendingActions(filteredActions);

      if (user?.id) {
        localStorage.setItem(`captain_data_${user.id}`, JSON.stringify(optimizedData));
        localStorage.setItem(`captain_pending_${user.id}`, JSON.stringify(filteredActions));
      }

      setSyncProgress(100);
      setSyncStatus('success');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
      console.log('✅ Captain storage optimized successfully');
    } catch (error) {
      console.error('❌ Captain storage optimization failed:', error);
      setSyncStatus('error');
      throw error;
    }
  }, [captainData, pendingActions, user?.id]);

  // Get storage stats
  const getStorageStats = useCallback(async () => {
    try {
      const dataSize = JSON.stringify(captainData).length;
      const actionsSize = JSON.stringify(pendingActions).length;
      
      return {
        totalSize: dataSize + actionsSize,
        teamCount: captainData.players.length,
        actionCount: pendingActions.length,
      };
    } catch (error) {
      console.error('❌ Failed to get captain storage stats:', error);
      return { totalSize: 0, teamCount: 0, actionCount: 0 };
    }
  }, [captainData, pendingActions]);

  // Background sync registration
  const registerBackgroundSync = useCallback(async (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`captain-${tag}`);
        console.log('🔄 Captain background sync registered:', tag);
      } catch (error) {
        console.error('❌ Failed to register captain background sync:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ Background sync not supported for captain');
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
          await processCaptainAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error(`❌ Failed to sync captain action ${action.id}:`, error);
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

      setSyncProgress(100);
      setLastSyncTime(new Date());
      setSyncStatus('success');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
      
    } catch (error) {
      console.error('❌ Captain sync failed:', error);
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

  const value: CaptainOfflineContextType = {
    isOnline,
    captainData,
    pendingActions,
    syncStatus,
    lastSyncTime,
    connectionQuality,
    syncProgress,
    cacheCaptainData,
    queueCaptainAction,
    syncPendingActions: enhancedSyncPendingActions,
    clearCache,
    optimizeStorage,
    getStorageStats,
    registerBackgroundSync
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
