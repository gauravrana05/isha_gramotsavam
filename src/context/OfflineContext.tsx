'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { getStorageManager } from '@/lib/services/offline/storageManager';
import { preloadVolunteerData, PreloadProgress, shouldRefreshVolunteerData } from '@/lib/services/offline/preloader';
import { getBackgroundSyncManager, SyncStats } from '@/lib/services/offline/backgroundSync';
import { getMediaUploadQueue, UploadStats, PostUpload } from '@/lib/services/offline/mediaQueue';
import { getConflictResolver, ConflictStats, DataConflict } from '@/lib/services/offline/conflictResolver';
import { getSyncMonitor, SyncHealth, SyncMetrics } from '@/lib/services/offline/syncMonitor';

// Connection quality levels
export enum ConnectionQuality {
  OFFLINE = 'offline',
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent',
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
}

export interface PendingAction {
  id: string;
  type: 'team_checkin' | 'player_verification' | 'match_score' | 'media_upload' | 'other';
  description: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  lastError?: string;
}

export interface NetworkMetrics {
  latency: number; // in milliseconds
  downloadSpeed: number; // in kbps
  connectionType: string; // 'wifi', '4g', '3g', etc.
  effectiveType: string; // 'slow-2g', '2g', '3g', '4g'
  saveData: boolean; // user's data saver preference
}

export interface CacheInfo {
  totalSize: number; // in bytes
  lastSync: number; // timestamp
  teamCount: number;
  playerCount: number;
  matchCount: number;
  pendingActionsCount: number;
  storageHealth?: {
    isHealthy: boolean;
    percentage: number;
    warnings: string[];
  };
  
  // Enhanced with background sync stats
  syncStats?: SyncStats;
  uploadStats?: UploadStats;
  conflictStats?: ConflictStats;
}

interface OfflineContextType {
  // Network status
  isOnline: boolean;
  isOffline: boolean;
  connectionQuality: ConnectionQuality;
  networkMetrics: NetworkMetrics | null;
  
  // Sync management
  syncStatus: SyncStatus;
  pendingActions: PendingAction[];
  lastSyncTime: number | null;
  syncProgress: number; // 0-100
  
  // Cache information
  cacheInfo: CacheInfo | null;
  
  // Actions
  checkConnection: () => Promise<boolean>;
  forcSync: () => Promise<void>;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingAction: (actionId: string) => void;
  updateCacheInfo: (info: Partial<CacheInfo>) => void;
  clearCache: () => Promise<void>;
  
  // Volunteer service integration
  preloadVolunteerData: (userId: string, options?: { forceRefresh?: boolean; priorityLevel?: 'critical' | 'full' | 'minimal' }) => Promise<void>;
  getStorageHealth: () => Promise<CacheInfo['storageHealth']>;
  optimizeStorage: () => Promise<void>;
  
  // Background sync integration
  queueSyncAction: (action: any) => Promise<string>;
  getSyncStats: () => Promise<SyncStats>;
  getSyncHealth: () => Promise<SyncHealth>;
  
  // Media upload integration
  queueMediaUpload: (file: File, metadata: any) => Promise<string>;
  queuePostUpload: (postData: any) => Promise<string>;
  getUploadStats: () => Promise<UploadStats>;
  cancelUpload: (uploadId: string) => Promise<boolean>;
  retryUpload: (uploadId: string) => Promise<boolean>;
  
  // Conflict resolution
  getConflictStats: () => Promise<ConflictStats>;
  getPendingConflicts: () => Promise<DataConflict[]>;
  resolveConflict: (conflictId: string, resolution?: any) => Promise<void>;
  
  // Advanced monitoring
  getSyncMetrics: () => Promise<SyncMetrics>;
  registerBackgroundSync: (tag: string) => Promise<void>;
  
  // Event callbacks
  onConnectionChange?: (isOnline: boolean, quality: ConnectionQuality) => void;
  onSyncComplete?: (success: boolean, synced: number, failed: number) => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isOffline: false,
  connectionQuality: ConnectionQuality.GOOD,
  networkMetrics: null,
  syncStatus: SyncStatus.IDLE,
  pendingActions: [],
  lastSyncTime: null,
  syncProgress: 0,
  cacheInfo: null,
  checkConnection: async () => true,
  forcSync: async () => {},
  addPendingAction: () => {},
  removePendingAction: () => {},
  updateCacheInfo: () => {},
  clearCache: async () => {},
  preloadVolunteerData: async () => {},
  getStorageHealth: async () => undefined,
  optimizeStorage: async () => {},
  queueSyncAction: async () => '',
  getSyncStats: async () => ({} as SyncStats),
  getSyncHealth: async () => ({} as SyncHealth),
  queueMediaUpload: async () => '',
  queuePostUpload: async () => '',
  getUploadStats: async () => ({} as UploadStats),
  cancelUpload: async () => false,
  retryUpload: async () => false,
  getConflictStats: async () => ({} as ConflictStats),
  getPendingConflicts: async () => [],
  resolveConflict: async () => {},
  getSyncMetrics: async () => ({} as SyncMetrics),
  registerBackgroundSync: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ 
  children: React.ReactNode;
  onConnectionChange?: (isOnline: boolean, quality: ConnectionQuality) => void;
  onSyncComplete?: (success: boolean, synced: number, failed: number) => void;
}> = ({ children, onConnectionChange, onSyncComplete }) => {
  // Import auth context
  const { user, loading: authLoading, isOfflineMode } = useAuth();
  
  // Network state
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.GOOD);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  
  // Add flag to prevent endless calls
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Cache state
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  
  // Service instances
  const volunteerService = getVolunteerService();
  const storageManager = getStorageManager();
  
  // Background sync and media services
  const backgroundSyncManager = getBackgroundSyncManager(
    (progress) => {
      // Update sync progress
      setSyncProgress(Math.round((progress.completed / progress.total) * 100));
    },
    async (conflict, action) => {
      // Handle conflict detection - for now, use default resolution
      console.warn('⚔️ Conflict detected in background sync:', conflict, action);
      return 'merge'; // Default to merge strategy
    }
  );
  
  const mediaUploadQueue = getMediaUploadQueue(
    (postId, progress) => {
      // Update upload progress for specific post
      console.log(`📤 Upload progress for ${postId}: ${progress}%`);
    },
    (postId, success) => {
      console.log(`📤 Upload ${success ? 'completed' : 'failed'} for ${postId}`);
    }
  );
  
  const conflictResolver = getConflictResolver(
    (conflict) => {
      console.warn('⚔️ New conflict detected:', conflict);
    },
    (conflict, resolution) => {
      console.log('✅ Conflict resolved:', conflict.id, resolution);
    }
  );
  
  const syncMonitor = getSyncMonitor(
    (health) => {
      // Update cache info with health status
      setCacheInfo(prev => prev ? {
        ...prev,
        storageHealth: {
          isHealthy: health.isHealthy,
          percentage: health.score,
          warnings: health.issues.map(issue => issue.description),
        }
      } : null);
    },
    (metrics) => {
      console.log('📊 Sync metrics updated:', metrics);
    },
    (issue) => {
      console.error('🚨 Critical sync issue detected:', issue);
      // Could trigger notification or alert here
    }
  );

  // Connection quality detection
  const detectConnectionQuality = useCallback(async (): Promise<ConnectionQuality> => {
    if (!navigator.onLine) {
      return ConnectionQuality.OFFLINE;
    }

    try {
      // Test connection quality with a small request
      const startTime = performance.now();
      const response = await fetch('/api/health?t=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      // Determine quality based on latency and response
      if (!response.ok) {
        return ConnectionQuality.POOR;
      }

      if (latency < 100) return ConnectionQuality.EXCELLENT;
      if (latency < 300) return ConnectionQuality.GOOD;
      if (latency < 1000) return ConnectionQuality.FAIR;
      return ConnectionQuality.POOR;

    } catch (error) {
      return ConnectionQuality.OFFLINE;
    }
  }, []);

  // Network metrics detection
  const updateNetworkMetrics = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkMetrics({
        latency: connection.rtt || 0,
        downloadSpeed: connection.downlink * 1000 || 0, // Convert to kbps
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        saveData: connection.saveData || false,
      });
    }
  }, []);

  // Connection checking
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const quality = await detectConnectionQuality();
    const online = quality !== ConnectionQuality.OFFLINE;
    
    setIsOnline(online);
    setConnectionQuality(quality);
    updateNetworkMetrics();
    
    // Trigger callback if provided
    if (onConnectionChange) {
      onConnectionChange(online, quality);
    }
    
    return online;
  }, [detectConnectionQuality, updateNetworkMetrics, onConnectionChange]);

  // Pending actions management
  const addPendingAction = useCallback((action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: PendingAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    setPendingActions(prev => [...prev, newAction]);
    
    // Update localStorage for persistence
    try {
      localStorage.setItem('volunteer-pending-actions', JSON.stringify([...pendingActions, newAction]));
    } catch (error) {
      console.warn('Failed to persist pending actions:', error);
    }
  }, [pendingActions]);

  const removePendingAction = useCallback((actionId: string) => {
    setPendingActions(prev => {
      const updated = prev.filter(action => action.id !== actionId);
      
      // Update localStorage
      try {
        localStorage.setItem('volunteer-pending-actions', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to persist pending actions:', error);
      }
      
      return updated;
    });
  }, []);

  // Cache management
  const updateCacheInfo = useCallback((info: Partial<CacheInfo>) => {
    setCacheInfo(prev => {
      const updated = { ...prev, ...info } as CacheInfo;
      
      // Persist cache info to localStorage
      try {
        localStorage.setItem('volunteer-cache-info', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to persist cache info:', error);
      }
      
      return updated;
    });
  }, []);

  const clearCache = useCallback(async () => {
    try {
      // Clear IndexedDB using volunteer service
      await volunteerService.clearAllData();
      
      // Clear localStorage cache data
      localStorage.removeItem('volunteer-cache-info');
      localStorage.removeItem('volunteer-pending-actions');
      
      // Reset state
      setCacheInfo(null);
      setPendingActions([]);
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [volunteerService]);

  // Volunteer service integration methods
  const preloadVolunteerData = useCallback(async (
    userId: string, 
    options: { forceRefresh?: boolean; priorityLevel?: 'critical' | 'full' | 'minimal' } = {}
  ) => {
    // Prevent multiple simultaneous calls
    if (isPreloading) {
      console.log('⚠️ Preload already in progress, skipping');
      return;
    }

    // Clear any existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    setIsPreloading(true);
    
    // Add timeout to prevent stuck sync
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Preload timeout - resetting sync status');
      setSyncStatus(SyncStatus.IDLE);
      setIsPreloading(false);
    }, 10000); // 10 second timeout

    try {
      setSyncStatus(SyncStatus.SYNCING);
      setSyncProgress(0);

      // Skip preload if not forced and recently done
      if (!options.forceRefresh) {
        const lastSync = localStorage.getItem(`last_preload_${userId}`);
        if (lastSync && Date.now() - parseInt(lastSync) < 60000) { // 1 minute cooldown
          console.log('📱 Preload skipped - too recent');
          clearTimeout(timeoutId);
          setSyncStatus(SyncStatus.IDLE);
          setIsPreloading(false);
          return;
        }
      }

      // Initialize volunteer service
      await volunteerService.initialize(userId);

      // Simple success without actual preload for now
      setSyncStatus(SyncStatus.SUCCESS);
      setLastSyncTime(Date.now());
      localStorage.setItem(`last_preload_${userId}`, Date.now().toString());
      
      console.log('✅ Volunteer service initialized (preload skipped)');

    } catch (error) {
      console.error('❌ Volunteer initialization failed:', error);
      setSyncStatus(SyncStatus.ERROR);
    } finally {
      clearTimeout(timeoutId);
      setIsPreloading(false);
      // Reset status after delay
      preloadTimeoutRef.current = setTimeout(() => setSyncStatus(SyncStatus.IDLE), 2000);
    }
  }, [volunteerService, isPreloading]);

  const getStorageHealth = useCallback(async (): Promise<CacheInfo['storageHealth']> => {
    try {
      const health = await storageManager.checkStorageHealth();
      return {
        isHealthy: health.isHealthy,
        percentage: health.usage.percentage,
        warnings: health.warnings,
      };
    } catch (error) {
      console.error('Failed to get storage health:', error);
      return undefined;
    }
  }, [storageManager]);

  const optimizeStorage = useCallback(async () => {
    try {
      setSyncStatus(SyncStatus.SYNCING);
      setSyncProgress(0);

      const result = await storageManager.optimizeStorage();
      
      if (result.success) {
        // Update cache info with new storage stats
        const storageStats = await volunteerService.getStorageStats();
        setCacheInfo(prev => prev ? {
          ...prev,
          totalSize: storageStats.totalSize,
          storageHealth: {
            isHealthy: true,
            percentage: (storageStats.totalSize / (50 * 1024 * 1024)) * 100, // 50MB limit
            warnings: [],
          }
        } : null);

        setSyncStatus(SyncStatus.SUCCESS);
        console.log('✅ Storage optimization completed:', {
          sizeBefore: Math.round(result.sizeBefore / 1024 / 1024) + 'MB',
          sizeAfter: Math.round(result.sizeAfter / 1024 / 1024) + 'MB',
          documentsRemoved: result.documentsRemoved,
        });
      } else {
        throw new Error('Storage optimization failed');
      }

    } catch (error) {
      console.error('❌ Storage optimization failed:', error);
      setSyncStatus(SyncStatus.ERROR);
    } finally {
      setTimeout(() => setSyncStatus(SyncStatus.IDLE), 2000);
    }
  }, [storageManager, volunteerService]);

  // Background sync integration methods
  const queueSyncAction = useCallback(async (action: any): Promise<string> => {
    try {
      await backgroundSyncManager.initialize();
      const actionId = await backgroundSyncManager.queueAction(action);
      
      // Register service worker background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`volunteer-sync-${actionId}`);
      }
      
      return actionId;
    } catch (error) {
      console.error('Failed to queue sync action:', error);
      throw error;
    }
  }, [backgroundSyncManager]);

  const getSyncStats = useCallback(async (): Promise<SyncStats> => {
    await backgroundSyncManager.initialize();
    return await backgroundSyncManager.getSyncStats();
  }, [backgroundSyncManager]);

  const getSyncHealth = useCallback(async (): Promise<SyncHealth> => {
    await syncMonitor.initialize();
    return await syncMonitor.getSyncHealth();
  }, [syncMonitor]);

  // Media upload integration methods
  const queueMediaUpload = useCallback(async (file: File, metadata: any): Promise<string> => {
    try {
      await mediaUploadQueue.initialize();
      return await mediaUploadQueue.queueMediaItem(file, metadata);
    } catch (error) {
      console.error('Failed to queue media upload:', error);
      throw error;
    }
  }, [mediaUploadQueue]);

  const queuePostUpload = useCallback(async (postData: any): Promise<string> => {
    try {
      await mediaUploadQueue.initialize();
      return await mediaUploadQueue.queuePost(postData);
    } catch (error) {
      console.error('Failed to queue post upload:', error);
      throw error;
    }
  }, [mediaUploadQueue]);

  const getUploadStats = useCallback(async (): Promise<UploadStats> => {
    await mediaUploadQueue.initialize();
    return await mediaUploadQueue.getUploadStats();
  }, [mediaUploadQueue]);

  const cancelUpload = useCallback(async (uploadId: string): Promise<boolean> => {
    await mediaUploadQueue.initialize();
    return await mediaUploadQueue.cancelUpload(uploadId);
  }, [mediaUploadQueue]);

  const retryUpload = useCallback(async (uploadId: string): Promise<boolean> => {
    await mediaUploadQueue.initialize();
    return await mediaUploadQueue.retryUpload(uploadId);
  }, [mediaUploadQueue]);

  // Conflict resolution methods
  const getConflictStats = useCallback(async (): Promise<ConflictStats> => {
    await conflictResolver.initialize();
    return await conflictResolver.getConflictStats();
  }, [conflictResolver]);

  const getPendingConflicts = useCallback(async (): Promise<DataConflict[]> => {
    await conflictResolver.initialize();
    const stats = await conflictResolver.getConflictStats();
    // Return empty array for now - in real implementation would return actual conflicts
    return [];
  }, [conflictResolver]);

  const resolveConflict = useCallback(async (conflictId: string, resolution?: any): Promise<void> => {
    await conflictResolver.initialize();
    await conflictResolver.resolveConflict(conflictId);
  }, [conflictResolver]);

  // Advanced monitoring methods
  const getSyncMetrics = useCallback(async (): Promise<SyncMetrics> => {
    await syncMonitor.initialize();
    return await syncMonitor.getSyncMetrics();
  }, [syncMonitor]);

  const registerBackgroundSync = useCallback(async (tag: string): Promise<void> => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log('🔄 Registered background sync:', tag);
      } catch (error) {
        console.error('Failed to register background sync:', error);
        throw error;
      }
    } else {
      console.warn('Background sync not supported');
    }
  }, []);

  // Force sync - Enhanced with volunteer service integration
  const forcSync = useCallback(async () => {
    if (syncStatus === SyncStatus.SYNCING) {
      console.log('Sync already in progress');
      return;
    }

    setSyncStatus(SyncStatus.SYNCING);
    setSyncProgress(0);
    
    try {
      let synced = 0;
      let failed = 0;
      
      // Get pending sync actions from volunteer service
      // For now, we'll continue with the existing pendingActions logic
      // but in a real implementation, this would integrate with the volunteer service
      const total = pendingActions.length;
      
      // Process pending actions
      for (let i = 0; i < pendingActions.length; i++) {
        const action = pendingActions[i];
        setSyncProgress(Math.round((i / total) * 100));
        
        try {
          // Here we would implement actual sync logic with volunteer service
          console.log(`Syncing action: ${action.type} - ${action.description}`);
          
          // Simulate sync delay
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Remove successful action
          removePendingAction(action.id);
          synced++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          failed++;
          
          // Update retry count
          setPendingActions(prev =>
            prev.map(a => 
              a.id === action.id 
                ? { ...a, retryCount: a.retryCount + 1, lastError: error instanceof Error ? error.message : 'Unknown error' }
                : a
            )
          );
        }
      }
      
      // Update cache info after sync
      try {
        const storageStats = await volunteerService.getStorageStats();
        setCacheInfo(prev => prev ? {
          ...prev,
          totalSize: storageStats.totalSize,
          pendingActionsCount: storageStats.pendingActions,
          lastSync: Date.now(),
        } : null);
      } catch (error) {
        console.warn('Failed to update cache info after sync:', error);
      }
      
      setSyncProgress(100);
      setSyncStatus(SyncStatus.SUCCESS);
      setLastSyncTime(Date.now());
      
      // Trigger callback
      if (onSyncComplete) {
        onSyncComplete(true, synced, failed);
      }
      
      // Reset status after a delay
      setTimeout(() => setSyncStatus(SyncStatus.IDLE), 2000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(SyncStatus.ERROR);
      
      if (onSyncComplete) {
        onSyncComplete(false, 0, pendingActions.length);
      }
      
      // Reset status after a delay
      setTimeout(() => setSyncStatus(SyncStatus.IDLE), 3000);
    }
  }, [syncStatus, pendingActions, removePendingAction, onSyncComplete, volunteerService]);

  // Initialize from localStorage
  useEffect(() => {
    // Load pending actions
    try {
      const savedActions = localStorage.getItem('volunteer-pending-actions');
      if (savedActions) {
        setPendingActions(JSON.parse(savedActions));
      }
    } catch (error) {
      console.warn('Failed to load pending actions from localStorage:', error);
    }

    // Load cache info
    try {
      const savedCacheInfo = localStorage.getItem('volunteer-cache-info');
      if (savedCacheInfo) {
        setCacheInfo(JSON.parse(savedCacheInfo));
      }
    } catch (error) {
      console.warn('Failed to load cache info from localStorage:', error);
    }

    // Initial connection check
    checkConnection();
    
    // Don't initialize services until we have authenticated user
    if (authLoading || !user?.id) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }
    
    // Initialize background sync services
    const initializeServices = async () => {
      try {
        // Initialize volunteer service first with proper error handling
        console.log('🔄 Initializing volunteer service for user:', user.id);
        await volunteerService.initialize(user.id);
        console.log('✅ Volunteer service initialized for user:', user.id);
        
        // Add small delay to ensure database is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🔄 Initializing background services...');
        await backgroundSyncManager.initialize();
        await mediaUploadQueue.initialize();
        await conflictResolver.initialize();
        await syncMonitor.initialize();
        
        console.log('✅ All offline services initialized');
        
        // Preload data for this user with delay
        if (!isOfflineMode && !isPreloading) {
          setTimeout(() => {
            preloadVolunteerData(user.id, { priorityLevel: 'critical' });
          }, 2000); // 2 second delay
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize offline services:', error);
        // Continue without offline services rather than breaking the app
        console.warn('⚠️ App will continue with limited offline functionality');
      }
    };
    
    initializeServices();
  }, [user?.id, authLoading, isOfflineMode, checkConnection, backgroundSyncManager, mediaUploadQueue, conflictResolver, syncMonitor]);

  // Network event listeners
  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
      // Auto-sync when coming back online
      if (pendingActions.length > 0) {
        setTimeout(() => forcSync(), 1000); // Delay to ensure connection is stable
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality(ConnectionQuality.OFFLINE);
      setSyncStatus(SyncStatus.IDLE);
      
      if (onConnectionChange) {
        onConnectionChange(false, ConnectionQuality.OFFLINE);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, pendingActions.length, forcSync, onConnectionChange]);

  // Periodic connection quality checks
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        checkConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, checkConnection]);

  // Auto-sync pending actions periodically when online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && syncStatus === SyncStatus.IDLE) {
      const interval = setInterval(() => {
        forcSync();
      }, 2 * 60 * 1000); // Try to sync every 2 minutes

      return () => clearInterval(interval);
    }
  }, [isOnline, pendingActions.length, syncStatus, forcSync]);

  const value: OfflineContextType = {
    // Network status
    isOnline,
    isOffline: !isOnline,
    connectionQuality,
    networkMetrics,
    
    // Sync management
    syncStatus,
    pendingActions,
    lastSyncTime,
    syncProgress,
    
    // Cache information
    cacheInfo,
    
    // Actions
    checkConnection,
    forcSync,
    addPendingAction,
    removePendingAction,
    updateCacheInfo,
    clearCache,
    
    // Volunteer service integration
    preloadVolunteerData,
    getStorageHealth,
    optimizeStorage,
    
    // Background sync integration
    queueSyncAction,
    getSyncStats,
    getSyncHealth,
    
    // Media upload integration
    queueMediaUpload,
    queuePostUpload,
    getUploadStats,
    cancelUpload,
    retryUpload,
    
    // Conflict resolution
    getConflictStats,
    getPendingConflicts,
    resolveConflict,
    
    // Advanced monitoring
    getSyncMetrics,
    registerBackgroundSync,
    
    // Event callbacks
    onConnectionChange,
    onSyncComplete,
  };

  // Don't provide offline context until user is authenticated
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>;
  }
  
  if (!user) {
    // User not authenticated - provide limited context
    return (
      <OfflineContext.Provider value={{
        isOnline: navigator?.onLine ?? true,
        isOffline: !navigator?.onLine ?? false,
        connectionQuality: ConnectionQuality.OFFLINE,
        networkMetrics: null,
        syncStatus: SyncStatus.IDLE,
        syncProgress: 0,
        pendingActions: [],
        cacheInfo: { totalSize: 0, lastSync: 0, teamCount: 0, playerCount: 0, matchCount: 0 },
        preloadProgress: null,
        syncStats: { totalActions: 0, completedActions: 0, failedActions: 0, lastSyncTime: 0, avgSyncTime: 0 },
        uploadStats: { totalUploads: 0, completedUploads: 0, failedUploads: 0, totalSize: 0, uploadedSize: 0 },
        conflictStats: { totalConflicts: 0, resolvedConflicts: 0, pendingConflicts: 0 },
        syncHealth: { status: 'critical', score: 0, issues: [], indicators: { syncSuccess: 0, responseTime: 0, queueHealth: 0, errorRate: 100 } },
        // Disabled functions for unauthenticated users
        forcSync: async () => false,
        addPendingAction: () => {},
        removePendingAction: () => {},
        clearPendingActions: () => {},
        preloadData: async () => ({ success: false, error: 'Not authenticated' }),
        clearCache: async () => {},
        getCacheSize: async () => 0,
        uploadMedia: async () => '',
        retryUpload: async () => false,
        getConflictStats: async () => ({} as ConflictStats),
        getPendingConflicts: async () => [],
        resolveConflict: async () => {},
        getSyncMetrics: async () => ({} as SyncMetrics),
        registerBackgroundSync: async () => {},
        onConnectionChange,
        onSyncComplete,
      }}>
        {children}
      </OfflineContext.Provider>
    );
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
