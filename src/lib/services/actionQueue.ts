/**
 * Action queue for offline operations with retry logic and conflict resolution
 * Manages pending actions when offline and syncs them when online
 */

import { getOfflineStorage, StorageCollection } from '../storage/offlineStorage';
import { getNetworkStatus } from '../utils/networkStatus';
import { getCacheService } from './cacheService';

export interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  collection: StorageCollection;
  documentId: string;
  data: any;
  timestamp: number;
  userId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  error?: string;
  metadata?: {
    dependencies?: string[];
    conflictResolution?: 'server-wins' | 'client-wins' | 'merge' | 'manual';
    optimisticUpdate?: boolean;
    rollbackData?: any;
  };
}

export interface ActionQueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageRetryCount: number;
  lastSyncAttempt: number;
  nextSyncScheduled: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export type ActionExecutor = (action: QueuedAction) => Promise<{ success: boolean; error?: string; data?: any }>;
export type ConflictResolver = (localData: any, remoteData: any, action: QueuedAction) => Promise<any>;
export type ProgressCallback = (stats: ActionQueueStats) => void;

class ActionQueueService {
  private storage = getOfflineStorage();
  private networkStatus = getNetworkStatus();
  private cacheService = getCacheService();
  
  private executors: Map<string, ActionExecutor> = new Map();
  private conflictResolvers: Map<string, ConflictResolver> = new Map();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private retryDelays = [1000, 2000, 5000, 10000, 30000]; // Progressive delays
  
  private stats: ActionQueueStats = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
    averageRetryCount: 0,
    lastSyncAttempt: 0,
    nextSyncScheduled: 0
  };

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the action queue service
   */
  private async initializeService(): Promise<void> {
    try {
      await this.storage;
      await this.updateStats();
      this.setupNetworkListener();
      this.startPeriodicProcessing();
    } catch (error) {
      // Failed to initialize ActionQueueService
    }
  }

  /**
   * Register an action executor for specific action types
   */
  registerExecutor(actionType: string, executor: ActionExecutor): void {
    this.executors.set(actionType.toLowerCase(), executor);
  }

  /**
   * Register a conflict resolver for specific collections
   */
  registerConflictResolver(collection: string, resolver: ConflictResolver): void {
    this.conflictResolvers.set(collection.toLowerCase(), resolver);
  }

  /**
   * Add an action to the queue
   */
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
    const storage = await this.storage;
    
    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateActionId(action),
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      maxRetries: action.maxRetries || 5
    };

    try {
      await storage.store('syncQueue', queuedAction.id, queuedAction, {
        userId: action.userId
      });

      // Handle optimistic updates
      if (queuedAction.metadata?.optimisticUpdate) {
        await this.applyOptimisticUpdate(queuedAction);
      }

      await this.updateStats();
      this.notifyProgress();

      // Try to process immediately if online
      if (this.networkStatus.isOnline()) {
        setImmediate(() => this.processQueue());
      }

      return queuedAction.id;
    } catch (error) {
      // Failed to enqueue action
      throw error;
    }
  }

  /**
   * Remove an action from the queue
   */
  async dequeue(actionId: string, userId?: string): Promise<boolean> {
    const storage = await this.storage;
    
    try {
      const result = await storage.hardDelete('syncQueue', actionId, { userId });
      
      if (result.success) {
        await this.updateStats();
        this.notifyProgress();
      }
      
      return result.success;
    } catch (error) {
      // Failed to dequeue action
      return false;
    }
  }

  /**
   * Get all pending actions for a user
   */
  async getPendingActions(userId?: string): Promise<QueuedAction[]> {
    const storage = await this.storage;
    
    try {
      const result = await storage.getAll('syncQueue', {
        userId,
        where: [
          { field: 'status', operator: '==', value: 'PENDING' },
          { field: 'status', operator: '==', value: 'FAILED' }
        ]
      });

      if (result.success && result.data) {
        return result.data
          .map(doc => doc.data as QueuedAction)
          .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
      }

      return [];
    } catch (error) {
      // Failed to get pending actions
      return [];
    }
  }

  /**
   * Process the action queue
   */
  async processQueue(userId?: string): Promise<SyncResult> {
    if (this.isProcessing) {
      return { success: false, processed: 0, successful: 0, failed: 0, errors: ['Already processing'] };
    }

    if (!this.networkStatus.isOnline()) {
      return { success: false, processed: 0, successful: 0, failed: 0, errors: ['Offline'] };
    }

    this.isProcessing = true;
    this.stats.lastSyncAttempt = Date.now();

    const result: SyncResult = {
      success: true,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const pendingActions = await this.getPendingActions(userId);
      
      for (const action of pendingActions) {
        if (!this.networkStatus.isOnline()) {
          break; // Stop processing if we go offline
        }

        const actionResult = await this.processAction(action);
        result.processed++;

        if (actionResult.success) {
          result.successful++;
          await this.markActionCompleted(action.id);
        } else {
          result.failed++;
          result.errors.push(actionResult.error || 'Unknown error');
          await this.handleActionFailure(action, actionResult.error);
        }

        // Small delay between actions to avoid overwhelming the server
        await this.delay(100);
      }

      await this.updateStats();
      this.notifyProgress();

      return result;
    } catch (error) {
      // Failed to process queue
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear completed actions from the queue
   */
  async clearCompleted(userId?: string, olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const storage = await this.storage;
    const cutoffTime = Date.now() - olderThanMs;
    
    try {
      const result = await storage.getAll('syncQueue', {
        userId,
        where: [{ field: 'status', operator: '==', value: 'COMPLETED' }]
      });

      if (!result.success || !result.data) return 0;

      let cleared = 0;
      for (const doc of result.data) {
        const action = doc.data as QueuedAction;
        if (action.timestamp < cutoffTime) {
          await storage.hardDelete('syncQueue', action.id, { userId });
          cleared++;
        }
      }

      if (cleared > 0) {
        await this.updateStats();
        this.notifyProgress();
      }

      return cleared;
    } catch (error) {
      // Failed to clear completed actions
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): ActionQueueStats {
    return { ...this.stats };
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Force sync now
   */
  async forceSync(userId?: string): Promise<SyncResult> {
    return this.processQueue(userId);
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.processingInterval) {
      this.startPeriodicProcessing();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pause();
    this.progressCallbacks.clear();
    this.executors.clear();
    this.conflictResolvers.clear();
  }

  // Private methods

  private generateActionId(action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): string {
    const timestamp = Date.now();
    const hash = this.hashString(`${action.type}_${action.collection}_${action.documentId}_${timestamp}`);
    return `action_${timestamp}_${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  private async processAction(action: QueuedAction): Promise<{ success: boolean; error?: string; data?: any }> {
    const storage = await this.storage;
    
    try {
      // Mark as in progress
      await this.markActionInProgress(action.id);

      // Get the appropriate executor
      const executor = this.executors.get(action.type.toLowerCase()) || 
                      this.executors.get('default') ||
                      this.defaultExecutor;

      // Execute the action
      const result = await executor(action);

      // Handle conflicts if action failed due to conflicts
      if (!result.success && result.error?.includes('conflict')) {
        const conflictResolver = this.conflictResolvers.get(action.collection.toLowerCase());
        if (conflictResolver) {
          try {
            const resolvedData = await conflictResolver(action.data, result.data, action);
            action.data = resolvedData;
            return await executor(action); // Retry with resolved data
          } catch (resolveError) {
            return { 
              success: false, 
              error: `Conflict resolution failed: ${resolveError}` 
            };
          }
        }
      }

      return result;
    } catch (error) {
      // Error processing action
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async applyOptimisticUpdate(action: QueuedAction): Promise<void> {
    const storage = await this.storage;
    
    try {
      if (action.type === 'CREATE' || action.type === 'UPDATE') {
        await storage.store(action.collection, action.documentId, {
          ...action.data,
          _optimistic: true,
          _actionId: action.id
        }, {
          userId: action.userId,
          useMemoryCache: true
        });
      } else if (action.type === 'DELETE') {
        await storage.delete(action.collection, action.documentId, {
          userId: action.userId
        });
      }

      // Cache the rollback data
      this.cacheService.set(`rollback_${action.id}`, action.metadata?.rollbackData, {
        ttl: 60 * 60 * 1000, // 1 hour
        priority: 'high',
        tags: ['rollback']
      });
    } catch (error) {
      // Failed to apply optimistic update
    }
  }

  private async rollbackOptimisticUpdate(action: QueuedAction): Promise<void> {
    const storage = await this.storage;
    const rollbackData = this.cacheService.get(`rollback_${action.id}`);
    
    try {
      if (rollbackData) {
        await storage.store(action.collection, action.documentId, rollbackData, {
          userId: action.userId,
          useMemoryCache: true
        });
      } else {
        // If no rollback data, remove the optimistic update
        await storage.delete(action.collection, action.documentId, {
          userId: action.userId
        });
      }

      this.cacheService.delete(`rollback_${action.id}`);
    } catch (error) {
      // Failed to rollback optimistic update
    }
  }

  private defaultExecutor: ActionExecutor = async (action: QueuedAction) => {
    // Default executor that delegates to registered handlers
    return {
      success: false,
      error: `No executor registered for action type: ${action.type}`
    };
  };

  private async markActionInProgress(actionId: string): Promise<void> {
    const storage = await this.storage;
    
    try {
      const result = await storage.get('syncQueue', actionId);
      if (result.success && result.data) {
        const action = result.data.data as QueuedAction;
        action.status = 'IN_PROGRESS';
        await storage.store('syncQueue', actionId, action, {
          userId: action.userId
        });
      }
    } catch (error) {
      // Failed to mark action in progress
    }
  }

  private async markActionCompleted(actionId: string): Promise<void> {
    const storage = await this.storage;
    
    try {
      const result = await storage.get('syncQueue', actionId);
      if (result.success && result.data) {
        const action = result.data.data as QueuedAction;
        action.status = 'COMPLETED';
        await storage.store('syncQueue', actionId, action, {
          userId: action.userId
        });
      }
    } catch (error) {
      // Failed to mark action completed
    }
  }

  private async handleActionFailure(action: QueuedAction, error?: string): Promise<void> {
    const storage = await this.storage;
    
    try {
      action.retryCount++;
      action.error = error;

      if (action.retryCount >= action.maxRetries) {
        action.status = 'FAILED';
        
        // Rollback optimistic update if it failed permanently
        if (action.metadata?.optimisticUpdate) {
          await this.rollbackOptimisticUpdate(action);
        }
      } else {
        action.status = 'PENDING';
      }

      await storage.store('syncQueue', action.id, action, {
        userId: action.userId
      });
    } catch (err) {
      // Failed to handle action failure
    }
  }

  private async updateStats(): Promise<void> {
    const storage = await this.storage;
    
    try {
      const result = await storage.getAll('syncQueue');
      if (!result.success || !result.data) return;

      const actions = result.data.map(doc => doc.data as QueuedAction);
      
      this.stats.pending = actions.filter(a => a.status === 'PENDING').length;
      this.stats.inProgress = actions.filter(a => a.status === 'IN_PROGRESS').length;
      this.stats.completed = actions.filter(a => a.status === 'COMPLETED').length;
      this.stats.failed = actions.filter(a => a.status === 'FAILED').length;
      this.stats.totalProcessed = this.stats.completed + this.stats.failed;
      
      const totalRetries = actions.reduce((sum, action) => sum + action.retryCount, 0);
      this.stats.averageRetryCount = actions.length > 0 ? totalRetries / actions.length : 0;
      
    } catch (error) {
      // Failed to update stats
    }
  }

  private notifyProgress(): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.stats);
      } catch (error) {
        // Progress callback error
      }
    });
  }

  private setupNetworkListener(): void {
    this.networkStatus.subscribe((event) => {
      if (event.changeType === 'online' && this.stats.pending > 0) {
        // Start processing when we come back online
        setTimeout(() => this.processQueue(), 1000);
      }
    });
  }

  private startPeriodicProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      if (this.networkStatus.isOnline() && this.stats.pending > 0) {
        await this.processQueue();
      }
      
      // Periodic cleanup of old completed actions
      if (Math.random() < 0.1) { // 10% chance each interval
        await this.clearCompleted();
      }
    }, 30000); // Every 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let actionQueueInstance: ActionQueueService | null = null;

/**
 * Get the singleton ActionQueueService instance
 */
export const getActionQueue = (): ActionQueueService => {
  if (!actionQueueInstance) {
    actionQueueInstance = new ActionQueueService();
  }
  return actionQueueInstance;
};

export { ActionQueueService };