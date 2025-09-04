import { useState, useCallback, useEffect } from 'react';
import { useOffline } from '@/context/OfflineContextWrapper';
import { syncService, SyncResult } from '@/lib/services/offline/syncService';
import { PendingAction } from '@/context/OfflineContext';

export interface SyncStats {
  totalPending: number;
  highPriority: number;
  failedActions: number;
  maxRetries: number;
  lastSyncResult?: SyncResult;
}

/**
 * Hook for enhanced sync operations with retry logic and batch processing
 */
export function useEnhancedSync() {
  const { isOnline, pendingActions } = useOffline();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalPending: 0,
    highPriority: 0,
    failedActions: 0,
    maxRetries: 0,
  });

  // Update sync stats when pending actions change
  useEffect(() => {
    setSyncStats({
      totalPending: pendingActions.length,
      highPriority: pendingActions.filter(a => a.priority === 'high').length,
      failedActions: pendingActions.filter(a => a.retryCount > 0).length,
      maxRetries: pendingActions.reduce((max, a) => Math.max(max, a.retryCount), 0),
      lastSyncResult: lastSyncResult || undefined,
    });
  }, [pendingActions, lastSyncResult]);

  /**
   * Sync all pending actions with retry logic
   */
  const syncWithRetry = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline || isSyncing || pendingActions.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    setIsSyncing(true);
    console.log('🔄 Starting enhanced sync...');

    try {
      const result = await syncService.syncWithRetry(pendingActions);
      setLastSyncResult(result);
      
      if (result.success) {
        console.log(`✅ All ${result.syncedCount} actions synced successfully`);
      } else {
        console.log(`⚠️ Sync completed with ${result.failedCount} failures`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Enhanced sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedCount: 0,
        failedCount: pendingActions.length,
        errors: [{ actionId: 'all', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pendingActions]);

  /**
   * Batch sync for efficiency
   */
  const batchSync = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline || isSyncing || pendingActions.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    setIsSyncing(true);
    console.log('📦 Starting batch sync...');

    try {
      const result = await syncService.batchSync(pendingActions);
      setLastSyncResult(result);
      return result;
    } catch (error) {
      console.error('❌ Batch sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedCount: 0,
        failedCount: pendingActions.length,
        errors: [{ actionId: 'batch', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pendingActions]);

  /**
   * Sync only high priority actions
   */
  const syncHighPriority = useCallback(async (): Promise<SyncResult> => {
    const highPriorityActions = pendingActions.filter(a => a.priority === 'high');
    
    if (!isOnline || isSyncing || highPriorityActions.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    setIsSyncing(true);
    console.log(`🔥 Syncing ${highPriorityActions.length} high priority actions...`);

    try {
      const result = await syncService.syncWithRetry(highPriorityActions);
      setLastSyncResult(result);
      return result;
    } catch (error) {
      console.error('❌ High priority sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedCount: 0,
        failedCount: highPriorityActions.length,
        errors: [{ actionId: 'high_priority', error: error instanceof Error ? error.message : 'Unknown error' }]
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pendingActions]);

  /**
   * Auto-sync when coming online
   */
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && !isSyncing) {
      console.log('📡 Auto-syncing on connection restore...');
      // Delay to allow connection to stabilize
      const timer = setTimeout(() => {
        syncWithRetry();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingActions.length, isSyncing, syncWithRetry]);

  return {
    isSyncing,
    syncStats,
    lastSyncResult,
    syncWithRetry,
    batchSync,
    syncHighPriority,
  };
}
