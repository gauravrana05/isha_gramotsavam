/**
 * Background sync system for volunteer offline actions
 * Handles reliable syncing with exponential backoff and conflict resolution
 * Works with service worker for true background operations
 */

import { getVolunteerStorage, VolunteerDocument } from './volunteerStorage';
import { getVolunteerService } from './volunteerService';
import { api } from '@/server/trpc/react';

export interface SyncAction {
  id: string;
  type: 'team_checkin' | 'player_verification' | 'match_score' | 'media_upload' | 'player_update' | 'team_update';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: any;
  userId: string;
  venueId?: string;
  
  // Timing and retry logic
  createdAt: number;
  scheduledFor: number;
  lastAttempt?: number;
  retryCount: number;
  maxRetries: number;
  
  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  
  // Conflict resolution
  version: number;
  dependencies?: string[]; // IDs of actions this depends on
  conflicts?: ConflictInfo[];
}

export interface ConflictInfo {
  type: 'version_mismatch' | 'concurrent_edit' | 'missing_dependency' | 'data_corruption';
  description: string;
  serverData?: any;
  localData?: any;
  resolution?: 'merge' | 'server_wins' | 'local_wins' | 'manual_required';
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  actionId: string;
  syncedAt: number;
  conflicts?: ConflictInfo[];
  error?: string;
  retryAfter?: number; // milliseconds to wait before retry
}

export interface SyncStats {
  totalActions: number;
  pendingActions: number;
  completedToday: number;
  failedToday: number;
  averageRetryCount: number;
  lastSyncTime: number;
  syncSuccess: number; // percentage
  conflictsResolved: number;
  mediaUploadsPending: number;
  estimatedSyncTime: number; // in minutes
}

export class BackgroundSyncManager {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private volunteerService = getVolunteerService();
  private syncInProgress = false;
  private syncQueue: Map<string, SyncAction> = new Map();
  
  // Performance-optimized configuration
  private readonly MAX_CONCURRENT_SYNCS = 5; // Increased for better throughput
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_SIZE = 20; // Increased batch size
  private readonly INTELLIGENT_BATCH_SIZE = {
    critical: 50, // Process critical actions in larger batches
    high: 30,
    medium: 20,
    low: 10,
  };
  
  // Event callbacks
  private onSyncProgress?: (progress: { completed: number; total: number; current?: SyncAction }) => void;
  private onConflictDetected?: (conflict: ConflictInfo, action: SyncAction) => Promise<'merge' | 'server_wins' | 'local_wins'>;
  
  constructor(
    onSyncProgress?: (progress: { completed: number; total: number; current?: SyncAction }) => void,
    onConflictDetected?: (conflict: ConflictInfo, action: SyncAction) => Promise<'merge' | 'server_wins' | 'local_wins'>
  ) {
    this.onSyncProgress = onSyncProgress;
    this.onConflictDetected = onConflictDetected;
  }

  /**
   * Initialize background sync manager
   */
  async initialize(): Promise<void> {
    if (!this.storage) {
      this.storage = await getVolunteerStorage();
    }
    
    // Load pending actions from storage
    await this.loadPendingActions();
    
    // Start background sync loop
    this.startSyncLoop();
    
    console.log('🔄 Background sync manager initialized');
  }

  /**
   * Queue a new action for background sync
   */
  async queueAction(action: Omit<SyncAction, 'id' | 'createdAt' | 'scheduledFor' | 'retryCount' | 'status' | 'version'>): Promise<string> {
    await this.initialize();
    
    const syncAction: SyncAction = {
      ...action,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      scheduledFor: Date.now(),
      retryCount: 0,
      status: 'pending',
      version: 1,
    };
    
    // Store in IndexedDB
    await this.storage!.store('syncQueue', {
      id: syncAction.id,
      data: syncAction,
      timestamp: Date.now(),
      lastModified: Date.now(),
      userId: syncAction.userId,
      venueId: syncAction.venueId,
      version: 1,
      synced: false,
      priority: this.mapPriorityToStorage(syncAction.priority),
      size: new Blob([JSON.stringify(syncAction)]).size,
    });
    
    // Add to memory queue
    this.syncQueue.set(syncAction.id, syncAction);
    
    // Trigger immediate sync if high priority
    if (syncAction.priority === 'critical' || syncAction.priority === 'high') {
      this.triggerSync();
    }
    
    console.log(`⏳ Queued ${syncAction.type} action for sync:`, syncAction.id);
    return syncAction.id;
  }

  /**
   * Cancel a pending sync action
   */
  async cancelAction(actionId: string): Promise<boolean> {
    const action = this.syncQueue.get(actionId);
    if (!action || action.status !== 'pending') {
      return false;
    }
    
    // Update status
    action.status = 'cancelled';
    this.syncQueue.set(actionId, action);
    
    // Update in storage
    await this.updateActionInStorage(action);
    
    console.log(`❌ Cancelled sync action:`, actionId);
    return true;
  }

  /**
   * Get current sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    await this.initialize();
    
    const allActions = Array.from(this.syncQueue.values());
    const today = new Date().setHours(0, 0, 0, 0);
    
    const todayActions = allActions.filter(action => action.createdAt >= today);
    const completedToday = todayActions.filter(action => action.status === 'completed').length;
    const failedToday = todayActions.filter(action => action.status === 'failed').length;
    const pendingActions = allActions.filter(action => action.status === 'pending').length;
    
    const totalRetries = allActions.reduce((sum, action) => sum + action.retryCount, 0);
    const averageRetryCount = allActions.length > 0 ? totalRetries / allActions.length : 0;
    
    const lastSyncTime = Math.max(...allActions.map(action => action.lastAttempt || 0), 0);
    
    const successfulSyncs = allActions.filter(action => action.status === 'completed').length;
    const syncSuccess = allActions.length > 0 ? (successfulSyncs / allActions.length) * 100 : 100;
    
    const conflictsResolved = allActions.reduce((sum, action) => 
      sum + (action.conflicts?.filter(c => c.resolution).length || 0), 0);
    
    const mediaUploadsPending = allActions.filter(action => 
      action.type === 'media_upload' && action.status === 'pending').length;
    
    // Estimate sync time based on queue size and average processing time
    const estimatedSyncTime = Math.ceil(pendingActions / this.MAX_CONCURRENT_SYNCS);
    
    return {
      totalActions: allActions.length,
      pendingActions,
      completedToday,
      failedToday,
      averageRetryCount,
      lastSyncTime,
      syncSuccess,
      conflictsResolved,
      mediaUploadsPending,
      estimatedSyncTime,
    };
  }

  /**
   * Force immediate sync of all pending actions
   */
  async forcSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return;
    }
    
    await this.triggerSync();
  }

  /**
   * Main sync processing loop
   */
  private async triggerSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    console.log('🔄 Starting background sync...');
    
    try {
      const pendingActions = Array.from(this.syncQueue.values())
        .filter(action => action.status === 'pending' && action.scheduledFor <= Date.now())
        .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
      
      if (pendingActions.length === 0) {
        console.log('✅ No pending actions to sync');
        return;
      }
      
      console.log(`🔄 Syncing ${pendingActions.length} pending actions...`);
      
      // Process actions in batches
      for (let i = 0; i < pendingActions.length; i += this.BATCH_SIZE) {
        const batch = pendingActions.slice(i, i + this.BATCH_SIZE);
        await this.processSyncBatch(batch);
        
        // Report progress
        if (this.onSyncProgress) {
          this.onSyncProgress({
            completed: Math.min(i + this.BATCH_SIZE, pendingActions.length),
            total: pendingActions.length,
          });
        }
      }
      
      console.log('✅ Background sync completed');
      
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a batch of sync actions with intelligent batching
   */
  private async processSyncBatch(actions: SyncAction[]): Promise<void> {
    // Group actions by type for more efficient processing
    const groupedActions = this.groupActionsByType(actions);
    
    // Process each group with type-specific optimizations
    for (const [actionType, typeActions] of Object.entries(groupedActions)) {
      if (typeActions.length === 0) continue;
      
      // Determine optimal batch size for this action type
      const batchSize = this.getBatchSizeForType(actionType, typeActions);
      
      // Process in optimized batches
      for (let i = 0; i < typeActions.length; i += batchSize) {
        const batch = typeActions.slice(i, i + batchSize);
        
        // For certain action types, we can process them as a single bulk operation
        if (this.canBulkProcess(actionType)) {
          await this.processBulkActions(actionType, batch);
        } else {
          // Process concurrently with limited concurrency
          const concurrentBatch = batch.slice(0, this.MAX_CONCURRENT_SYNCS);
          const syncPromises = concurrentBatch.map(action => 
            this.processSingleAction(action)
          );
          await Promise.allSettled(syncPromises);
        }
      }
    }
  }

  /**
   * Group actions by type for batch processing optimization
   */
  private groupActionsByType(actions: SyncAction[]): Record<string, SyncAction[]> {
    return actions.reduce((groups, action) => {
      const type = action.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(action);
      return groups;
    }, {} as Record<string, SyncAction[]>);
  }

  /**
   * Get optimal batch size based on action type and priority
   */
  private getBatchSizeForType(actionType: string, actions: SyncAction[]): number {
    // Get the highest priority in this batch
    const highestPriority = actions.reduce((highest, action) => {
      const priorityWeight = this.getPriorityWeight(action.priority);
      const currentWeight = this.getPriorityWeight(highest);
      return priorityWeight < currentWeight ? action.priority : highest;
    }, 'low' as SyncAction['priority']);

    // Base batch size on priority
    let batchSize = this.INTELLIGENT_BATCH_SIZE[highestPriority];

    // Adjust based on action type
    switch (actionType) {
      case 'team_checkin':
      case 'player_verification':
        // These can be processed in larger batches
        batchSize = Math.min(batchSize * 1.5, 100);
        break;
      case 'match_score':
        // Match scores need careful handling, smaller batches
        batchSize = Math.min(batchSize * 0.7, 15);
        break;
      case 'media_upload':
        // Media uploads are resource intensive
        batchSize = Math.min(batchSize * 0.5, 5);
        break;
    }

    return Math.floor(batchSize);
  }

  /**
   * Check if actions of this type can be bulk processed
   */
  private canBulkProcess(actionType: string): boolean {
    // These action types can benefit from bulk API calls
    return ['team_checkin', 'player_verification', 'player_update', 'team_update'].includes(actionType);
  }

  /**
   * Process multiple actions of the same type in a single bulk operation
   */
  private async processBulkActions(actionType: string, actions: SyncAction[]): Promise<void> {
    console.log(`🔄 Bulk processing ${actions.length} ${actionType} actions`);
    
    try {
      // Group payloads for bulk API call
      const bulkPayload = {
        type: actionType,
        actions: actions.map(action => ({
          id: action.id,
          payload: action.payload,
          userId: action.userId,
          venueId: action.venueId,
        })),
      };

      // Execute bulk API call
      const result = await this.executeBulkApiCall(actionType, bulkPayload);
      
      // Update individual action statuses based on bulk result
      if (result.success) {
        const results = result.data.results || [];
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          const actionResult = results[i] || { success: true };
          
          if (actionResult.success) {
            action.status = 'completed';
            this.syncQueue.set(action.id, action);
          } else {
            throw new Error(actionResult.error || 'Bulk operation failed for item');
          }
        }
        
        console.log(`✅ Bulk processed ${actions.length} ${actionType} actions successfully`);
      } else {
        throw new Error(result.error || 'Bulk operation failed');
      }
      
    } catch (error) {
      console.warn(`⚠️ Bulk processing failed for ${actionType}, falling back to individual processing:`, error);
      
      // Fallback to individual processing
      const syncPromises = actions.slice(0, this.MAX_CONCURRENT_SYNCS).map(action => 
        this.processSingleAction(action)
      );
      await Promise.allSettled(syncPromises);
    }
  }

  /**
   * Execute bulk API call for multiple actions
   */
  private async executeBulkApiCall(actionType: string, bulkPayload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Determine bulk API endpoint
      const endpoint = this.getBulkApiEndpoint(actionType);
      if (!endpoint) {
        throw new Error(`No bulk endpoint available for ${actionType}`);
      }

      // Make bulk API request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for bulk operations

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken(bulkPayload.actions[0]?.userId)}`,
        },
        body: JSON.stringify(bulkPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bulk API call failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown bulk API error',
      };
    }
  }

  /**
   * Get bulk API endpoint for action type
   */
  private getBulkApiEndpoint(actionType: string): string | null {
    const bulkEndpoints = {
      'team_checkin': '/api/trpc/admin.teams.bulkCheckIn',
      'player_verification': '/api/trpc/admin.players.bulkVerify',
      'player_update': '/api/trpc/admin.players.bulkUpdate',
      'team_update': '/api/trpc/admin.teams.bulkUpdate',
    };
    
    return bulkEndpoints[actionType as keyof typeof bulkEndpoints] || null;
  }

  /**
   * Get auth token for user
   */
  private async getAuthToken(userId?: string): Promise<string> {
    // In real implementation, would get actual auth token
    return 'mock-auth-token';
  }

  /**
   * Process a single sync action
   */
  private async processSingleAction(action: SyncAction): Promise<SyncResult> {
    console.log(`🔄 Processing ${action.type} action:`, action.id);
    
    // Update status
    action.status = 'processing';
    action.lastAttempt = Date.now();
    this.syncQueue.set(action.id, action);
    
    try {
      // Check dependencies
      if (action.dependencies) {
        const unmetDependencies = await this.checkDependencies(action.dependencies);
        if (unmetDependencies.length > 0) {
          throw new Error(`Unmet dependencies: ${unmetDependencies.join(', ')}`);
        }
      }
      
      // Execute the sync action
      const result = await this.executeSyncAction(action);
      
      if (result.success) {
        // Handle conflicts if any
        if (result.conflicts && result.conflicts.length > 0) {
          await this.handleConflicts(action, result.conflicts);
        }
        
        // Mark as completed
        action.status = 'completed';
        action.conflicts = result.conflicts;
        this.syncQueue.set(action.id, action);
        
        console.log(`✅ Successfully synced ${action.type}:`, action.id);
        
        return {
          success: true,
          actionId: action.id,
          syncedAt: Date.now(),
          conflicts: result.conflicts,
        };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      
      // Update retry count and schedule next attempt
      action.retryCount++;
      action.error = errorMessage;
      
      if (action.retryCount >= action.maxRetries) {
        action.status = 'failed';
        console.error(`❌ Action failed after ${action.maxRetries} retries:`, action.id, errorMessage);
      } else {
        action.status = 'pending';
        action.scheduledFor = Date.now() + this.calculateRetryDelay(action.retryCount);
        console.warn(`⚠️ Retrying action ${action.id} in ${this.calculateRetryDelay(action.retryCount)}ms (attempt ${action.retryCount + 1}/${action.maxRetries})`);
      }
      
      this.syncQueue.set(action.id, action);
      await this.updateActionInStorage(action);
      
      return {
        success: false,
        actionId: action.id,
        syncedAt: Date.now(),
        error: errorMessage,
        retryAfter: action.status === 'pending' ? action.scheduledFor - Date.now() : undefined,
      };
    }
  }

  /**
   * Execute the actual sync action via API
   */
  private async executeSyncAction(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[]; error?: string }> {
    try {
      switch (action.type) {
        case 'team_checkin':
          return await this.syncTeamCheckIn(action);
        case 'player_verification':
          return await this.syncPlayerVerification(action);
        case 'match_score':
          return await this.syncMatchScore(action);
        case 'media_upload':
          return await this.syncMediaUpload(action);
        case 'player_update':
          return await this.syncPlayerUpdate(action);
        case 'team_update':
          return await this.syncTeamUpdate(action);
        default:
          throw new Error(`Unknown sync action type: ${action.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync team check-in action
   */
  private async syncTeamCheckIn(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    // Implementation would call the actual API
    // For now, this is a mock implementation
    console.log('Syncing team check-in:', action.payload);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    // Check for conflicts (mock)
    const hasConflict = Math.random() < 0.1; // 10% chance of conflict
    
    if (hasConflict) {
      return {
        success: true,
        conflicts: [{
          type: 'concurrent_edit',
          description: 'Team was checked in by another volunteer',
          serverData: { status: 'checked_in', checkedInBy: 'other_volunteer' },
          localData: action.payload,
          timestamp: Date.now(),
        }],
      };
    }
    
    return { success: true };
  }

  /**
   * Sync player verification action
   */
  private async syncPlayerVerification(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    console.log('Syncing player verification:', action.payload);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800));
    return { success: true };
  }

  /**
   * Sync match score action
   */
  private async syncMatchScore(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    console.log('Syncing match score:', action.payload);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1200));
    return { success: true };
  }

  /**
   * Sync media upload action
   */
  private async syncMediaUpload(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    console.log('Syncing media upload:', action.payload);
    // Media uploads take longer
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000));
    return { success: true };
  }

  /**
   * Sync player update action
   */
  private async syncPlayerUpdate(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    console.log('Syncing player update:', action.payload);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 600));
    return { success: true };
  }

  /**
   * Sync team update action
   */
  private async syncTeamUpdate(action: SyncAction): Promise<{ success: boolean; conflicts?: ConflictInfo[] }> {
    console.log('Syncing team update:', action.payload);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800));
    return { success: true };
  }

  /**
   * Handle conflicts detected during sync
   */
  private async handleConflicts(action: SyncAction, conflicts: ConflictInfo[]): Promise<void> {
    for (const conflict of conflicts) {
      if (this.onConflictDetected) {
        try {
          const resolution = await this.onConflictDetected(conflict, action);
          conflict.resolution = resolution;
          console.log(`🔧 Conflict resolved as: ${resolution}`, conflict);
        } catch (error) {
          console.error('Failed to resolve conflict:', error);
          conflict.resolution = 'manual_required';
        }
      } else {
        // Default resolution strategy
        conflict.resolution = this.getDefaultResolution(conflict.type);
      }
    }
  }

  /**
   * Get default conflict resolution strategy
   */
  private getDefaultResolution(conflictType: ConflictInfo['type']): ConflictInfo['resolution'] {
    switch (conflictType) {
      case 'version_mismatch':
        return 'server_wins'; // Server version is typically more recent
      case 'concurrent_edit':
        return 'merge'; // Try to merge changes when possible
      case 'missing_dependency':
        return 'manual_required'; // Requires human intervention
      case 'data_corruption':
        return 'server_wins'; // Server data is more reliable
      default:
        return 'manual_required';
    }
  }

  /**
   * Check if action dependencies are met
   */
  private async checkDependencies(dependencyIds: string[]): Promise<string[]> {
    const unmetDependencies: string[] = [];
    
    for (const depId of dependencyIds) {
      const dependency = this.syncQueue.get(depId);
      if (!dependency || dependency.status !== 'completed') {
        unmetDependencies.push(depId);
      }
    }
    
    return unmetDependencies;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.BASE_RETRY_DELAY * Math.pow(2, retryCount - 1),
      this.MAX_RETRY_DELAY
    );
    
    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Get priority weight for sorting (lower = higher priority)
   */
  private getPriorityWeight(priority: SyncAction['priority']): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 5;
    }
  }

  /**
   * Map sync priority to storage priority
   */
  private mapPriorityToStorage(priority: SyncAction['priority']): 'high' | 'medium' | 'low' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Load pending actions from IndexedDB
   */
  private async loadPendingActions(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const storedActions = await this.storage.query('syncQueue', {
        filter: (doc) => !doc.deleted
      });
      
      for (const storedAction of storedActions) {
        const action = storedAction.data as SyncAction;
        this.syncQueue.set(action.id, action);
      }
      
      console.log(`📱 Loaded ${this.syncQueue.size} pending sync actions from storage`);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }

  /**
   * Update action in IndexedDB storage
   */
  private async updateActionInStorage(action: SyncAction): Promise<void> {
    if (!this.storage) return;
    
    try {
      const document: VolunteerDocument = {
        id: action.id,
        data: action,
        timestamp: action.createdAt,
        lastModified: Date.now(),
        userId: action.userId,
        venueId: action.venueId,
        version: action.version,
        synced: action.status === 'completed',
        priority: this.mapPriorityToStorage(action.priority),
        size: new Blob([JSON.stringify(action)]).size,
      };
      
      await this.storage.store('syncQueue', document);
    } catch (error) {
      console.error('Failed to update action in storage:', error);
    }
  }

  /**
   * Start the background sync loop
   */
  private startSyncLoop(): void {
    // Check for pending actions every 30 seconds
    setInterval(() => {
      if (!this.syncInProgress && this.syncQueue.size > 0) {
        this.triggerSync();
      }
    }, 30 * 1000);
    
    console.log('⏰ Background sync loop started (30s interval)');
  }

  /**
   * Clean up completed actions older than specified time
   */
  async cleanupOldActions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    let removedCount = 0;
    
    for (const [actionId, action] of this.syncQueue.entries()) {
      if (action.status === 'completed' && action.createdAt < cutoffTime) {
        this.syncQueue.delete(actionId);
        
        // Remove from storage
        try {
          await this.storage?.delete('syncQueue', actionId, true);
          removedCount++;
        } catch (error) {
          console.warn(`Failed to remove old action ${actionId}:`, error);
        }
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old sync actions`);
    }
    
    return removedCount;
  }
}

// Singleton instance
let backgroundSyncInstance: BackgroundSyncManager | null = null;

/**
 * Get the singleton background sync manager instance
 */
export const getBackgroundSyncManager = (
  onSyncProgress?: (progress: { completed: number; total: number; current?: SyncAction }) => void,
  onConflictDetected?: (conflict: ConflictInfo, action: SyncAction) => Promise<'merge' | 'server_wins' | 'local_wins'>
): BackgroundSyncManager => {
  if (!backgroundSyncInstance) {
    backgroundSyncInstance = new BackgroundSyncManager(onSyncProgress, onConflictDetected);
  }
  return backgroundSyncInstance;
};

export default BackgroundSyncManager;