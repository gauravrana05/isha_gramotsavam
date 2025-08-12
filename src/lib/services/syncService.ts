/**
 * Sync service that bridges offline storage with background sync
 * Manages sync queue and coordinates with service worker
 */

import { getOfflineStorage, StorageCollection } from '../storage/offlineStorage';
import { getIndexedDB, SyncAction } from '../storage/indexedDB';
import { getBackgroundSync } from './backgroundSync';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private storage = getOfflineStorage();
  private bgSync = getBackgroundSync();
  private isSyncing = false;

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    await this.storage;
    console.log('SyncService initialized');
  }

  /**
   * Add an action to the sync queue
   */
  async queueAction(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    collection: StorageCollection,
    documentId: string,
    data: any,
    userId: string
  ): Promise<void> {
    const syncAction: SyncAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      collection,
      documentId,
      data,
      timestamp: Date.now(),
      userId,
      status: 'PENDING',
      retryCount: 0
    };

    const storage = await this.storage;
    await storage.store('syncQueue', syncAction.id, syncAction);

    // Register background sync if supported
    if (this.bgSync.isBackgroundSyncSupported()) {
      await this.bgSync.registerSync();
    }
  }

  /**
   * Process sync queue manually
   */
  async processQueue(userId?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
      const storage = await this.storage;
      const pendingActions = await storage.getAll('syncQueue', {
        where: [{ field: 'status', operator: '==', value: 'PENDING' }],
        userId
      });

      if (!pendingActions.success || !pendingActions.data) {
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      for (const actionDoc of pendingActions.data) {
        const action = actionDoc.data as SyncAction;
        
        // Skip if exceeded max retries
        if (action.retryCount >= 3) {
          continue;
        }

        try {
          // Mark as syncing
          action.status = 'SYNCING';
          await storage.store('syncQueue', action.id, action);

          // Execute sync action (this would integrate with Firebase)
          const success = await this.executeSyncAction(action);

          if (success) {
            action.status = 'SYNCED';
            synced++;
          } else {
            action.status = 'FAILED';
            action.retryCount++;
            failed++;
            errors.push(`Failed to sync ${action.type} on ${action.collection}/${action.documentId}`);
          }

          await storage.store('syncQueue', action.id, action);
        } catch (error) {
          action.status = 'FAILED';
          action.retryCount++;
          action.error = error instanceof Error ? error.message : 'Unknown error';
          failed++;
          errors.push(action.error);
          await storage.store('syncQueue', action.id, action);
        }
      }

      return { success: true, synced, failed, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a sync action with Firebase
   */
  private async executeSyncAction(action: SyncAction): Promise<boolean> {
    // This is a placeholder for Firebase integration
    // In a real implementation, this would make actual Firebase calls
    console.log(`Executing sync action: ${action.type} on ${action.collection}/${action.documentId}`);
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For now, return success to avoid blocking
    return true;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(userId?: string): Promise<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
  }> {
    const storage = await this.storage;
    
    const [pending, syncing, synced, failed] = await Promise.all([
      storage.getAll('syncQueue', { where: [{ field: 'status', operator: '==', value: 'PENDING' }], userId }),
      storage.getAll('syncQueue', { where: [{ field: 'status', operator: '==', value: 'SYNCING' }], userId }),
      storage.getAll('syncQueue', { where: [{ field: 'status', operator: '==', value: 'SYNCED' }], userId }),
      storage.getAll('syncQueue', { where: [{ field: 'status', operator: '==', value: 'FAILED' }], userId })
    ]);

    return {
      pending: pending.data?.length || 0,
      syncing: syncing.data?.length || 0,
      synced: synced.data?.length || 0,
      failed: failed.data?.length || 0
    };
  }

  /**
   * Clear completed sync actions
   */
  async clearCompleted(userId?: string): Promise<void> {
    const storage = await this.storage;
    const completed = await storage.getAll('syncQueue', { 
      where: [{ field: 'status', operator: '==', value: 'SYNCED' }], 
      userId 
    });

    if (completed.success && completed.data) {
      for (const actionDoc of completed.data) {
        await storage.hardDelete('syncQueue', actionDoc.id);
      }
    }
  }

  /**
   * Reset failed actions to pending
   */
  async retryFailed(userId?: string): Promise<void> {
    const storage = await this.storage;
    const failed = await storage.getAll('syncQueue', { 
      where: [{ field: 'status', operator: '==', value: 'FAILED' }], 
      userId 
    });

    if (failed.success && failed.data) {
      for (const actionDoc of failed.data) {
        const action = actionDoc.data as SyncAction;
        action.status = 'PENDING';
        action.retryCount = 0;
        delete action.error;
        await storage.store('syncQueue', action.id, action);
      }
    }

    // Register background sync
    if (this.bgSync.isBackgroundSyncSupported()) {
      await this.bgSync.registerSync();
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

/**
 * Get the singleton SyncService instance
 */
export const getSyncService = async (): Promise<SyncService> => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
    await syncServiceInstance.initialize();
  }
  return syncServiceInstance;
};

export { SyncService };