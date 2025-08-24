"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getOfflineDataService, SyncStatus } from "@/lib/services/offlineDataService";
import { getActionQueue, ActionQueueStats } from "@/lib/services/actionQueue";
import { getNetworkStatus, NetworkStatus } from "@/lib/utils/networkStatus";
import { useAuth } from "@/context/AuthContext";

interface OfflineContextType {
  // Network status
  isOffline: boolean;
  networkStatus: NetworkStatus;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  
  // Sync status
  syncStatus: SyncStatus;
  queueStats: ActionQueueStats;
  isSyncing: boolean;
  
  // Actions
  forceSync: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  
  // Storage management
  clearOfflineData: () => Promise<void>;
  getStorageInfo: () => Promise<{
    totalSize: number;
    collections: { [key: string]: number };
    unsyncedCount: number;
  }>;
  
  // Offline capabilities
  isOfflineCapable: boolean;
  lastSyncTime: number | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get auth context - should be available since AuthProvider is above us
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    // Auth context not available yet, that's okay for offline functionality
    console.debug('Auth context not available in OfflineProvider:', error);
  }
  
  // Network and connection state
  const [isOffline, setIsOffline] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionQuality: 'good',
    timestamp: Date.now()
  });
  
  // Sync and queue state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: 0,
    pendingActions: 0,
    errors: [],
    isOnline: true
  });
  const [queueStats, setQueueStats] = useState<ActionQueueStats>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
    averageRetryCount: 0,
    lastSyncAttempt: 0,
    nextSyncScheduled: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineCapable, setIsOfflineCapable] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Initialize services
  useEffect(() => {
    const initializeOfflineCapabilities = async () => {
      try {
        // Initialize services safely
        const networkService = getNetworkStatus();
        const dataService = await getOfflineDataService();
        const queueService = getActionQueue();
        
        // Set up network status monitoring
        networkService.startMonitoring();
        const unsubscribeNetwork = networkService.subscribe((event) => {
          setIsOffline(!event.status.isOnline);
          setNetworkStatus(event.status);
          
          // Trigger sync when coming back online
          if (event.changeType === 'online') {
            handleAutoSync();
          }
        });

        // Set up queue monitoring
        const unsubscribeQueue = queueService.subscribe((stats) => {
          setQueueStats(stats);
        });

        // Set initial states
        const initialStatus = networkService.getStatus();
        setIsOffline(!initialStatus.isOnline);
        setNetworkStatus(initialStatus);
        setIsOfflineCapable(true);

        // Load initial sync status
        await updateSyncStatus();

        return () => {
          unsubscribeNetwork();
          unsubscribeQueue();
          networkService.stopMonitoring();
        };
      } catch (error) {
        // Error handling removed
        setIsOfflineCapable(false);
      }
    };

    initializeOfflineCapabilities();
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.uid) {
        updateSyncStatus();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user?.uid]);

  const updateSyncStatus = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const dataService = await getOfflineDataService();
      const status = await dataService.getSyncStatus(user.uid);
      setSyncStatus(status);
      
      if (status.lastSync > 0) {
        setLastSyncTime(status.lastSync);
      }
    } catch (error) {
      console.debug('Failed to update sync status (this is normal during initialization):', error);
    }
  }, [user?.uid]);

  const handleAutoSync = useCallback(async () => {
    if (!user?.uid || isSyncing) return;

    try {
      setIsSyncing(true);
      const queueService = getActionQueue();
      await queueService.forceSync(user.uid);
      await updateSyncStatus();
    } catch (error) {
      // Error handling removed
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, isSyncing, updateSyncStatus]);

  const forceSync = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsSyncing(true);
      const [dataService, queueService] = await Promise.all([
        getOfflineDataService(),
        getActionQueue()
      ]);

      // Force sync both services
      await Promise.all([
        dataService.forcSync(user.uid),
        queueService.forceSync(user.uid)
      ]);

      await updateSyncStatus();
    } catch (error) {
      // Error handling removed
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, updateSyncStatus]);

  const clearSyncQueue = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const queueService = getActionQueue();
      await queueService.clearCompleted(user.uid);
      await updateSyncStatus();
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }, [user?.uid, updateSyncStatus]);

  const pauseSync = useCallback(() => {
    try {
      const queueService = getActionQueue();
      queueService.pause();
    } catch (error) {
      // Error handling removed
    }
  }, []);

  const resumeSync = useCallback(() => {
    try {
      const queueService = getActionQueue();
      queueService.resume();
    } catch (error) {
      // Error handling removed
    }
  }, []);

  const clearOfflineData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const dataService = await getOfflineDataService();
      // This would need to be implemented in the data service
      // await dataService.clearAllData(user.uid);
      await updateSyncStatus();
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }, [user?.uid, updateSyncStatus]);

  const getStorageInfo = useCallback(async () => {
    try {
      const dataService = await getOfflineDataService();
      // This would need to be implemented to return storage info
      return {
        totalSize: 0,
        collections: {},
        unsyncedCount: syncStatus.pendingActions
      };
    } catch (error) {
      // Error handling removed
      return {
        totalSize: 0,
        collections: {},
        unsyncedCount: 0
      };
    }
  }, [syncStatus.pendingActions]);

  const value: OfflineContextType = {
    // Network status
    isOffline,
    networkStatus,
    connectionQuality: networkStatus.connectionQuality,
    
    // Sync status
    syncStatus,
    queueStats,
    isSyncing,
    
    // Actions
    forceSync,
    clearSyncQueue,
    pauseSync,
    resumeSync,
    
    // Storage management
    clearOfflineData,
    getStorageInfo,
    
    // Offline capabilities
    isOfflineCapable,
    lastSyncTime
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};