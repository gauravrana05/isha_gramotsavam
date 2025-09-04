/**
 * Enhanced sync service with retry logic, conflict resolution, and batch operations
 */

import { PendingAction } from '@/context/OfflineContext';
import { api } from '@/server/trpc/react';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ actionId: string; error: string }>;
}

export interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  resolvedData: any;
  conflictTime: number;
}

export class EnhancedSyncService {
  private maxRetries = 3;
  private retryDelay = 30000; // 30 seconds
  private batchSize = 10;

  /**
   * Sync actions with retry logic and priority ordering
   */
  async syncWithRetry(actions: PendingAction[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    // Sort by priority: high -> medium -> low
    const sortedActions = this.sortByPriority(actions);
    
    console.log(`🔄 Starting enhanced sync for ${sortedActions.length} actions`);

    for (const action of sortedActions) {
      try {
        // Skip actions that exceeded max retries
        if (action.retryCount >= this.maxRetries) {
          console.log(`❌ Skipping ${action.id} - max retries exceeded`);
          result.failedCount++;
          result.errors.push({
            actionId: action.id,
            error: `Max retries (${this.maxRetries}) exceeded`
          });
          continue;
        }

        await this.syncSingleAction(action);
        result.syncedCount++;
        console.log(`✅ Synced: ${action.description}`);

      } catch (error) {
        result.failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          actionId: action.id,
          error: errorMessage
        });
        
        console.error(`❌ Failed to sync ${action.id}:`, errorMessage);
      }
    }

    result.success = result.failedCount === 0;
    console.log(`📊 Sync complete: ${result.syncedCount} succeeded, ${result.failedCount} failed`);
    
    return result;
  }

  /**
   * Batch sync operations for efficiency
   */
  async batchSync(actions: PendingAction[]): Promise<SyncResult> {
    const batches = this.createBatches(actions, this.batchSize);
    const results: SyncResult[] = [];

    for (const batch of batches) {
      console.log(`📦 Processing batch of ${batch.length} actions`);
      const batchResult = await this.syncWithRetry(batch);
      results.push(batchResult);
      
      // Small delay between batches to avoid overwhelming the server
      await this.delay(1000);
    }

    // Combine results
    return results.reduce((combined, result) => ({
      success: combined.success && result.success,
      syncedCount: combined.syncedCount + result.syncedCount,
      failedCount: combined.failedCount + result.failedCount,
      errors: [...combined.errors, ...result.errors]
    }), { success: true, syncedCount: 0, failedCount: 0, errors: [] });
  }

  /**
   * Resolve data conflicts using different strategies
   */
  async resolveConflict(
    localData: any,
    serverData: any,
    entityType: string,
    strategy: ConflictResolution['strategy'] = 'server_wins'
  ): Promise<ConflictResolution> {
    
    console.log(`🔀 Resolving conflict for ${entityType} using ${strategy}`);

    let resolvedData: any;

    switch (strategy) {
      case 'server_wins':
        resolvedData = serverData;
        break;
        
      case 'client_wins':
        resolvedData = localData;
        break;
        
      case 'merge':
        resolvedData = this.mergeData(localData, serverData);
        break;
        
      case 'manual':
        // In production, this would trigger a UI for manual resolution
        resolvedData = await this.requestManualResolution(localData, serverData);
        break;
        
      default:
        resolvedData = serverData; // Default to server wins
    }

    return {
      strategy,
      resolvedData,
      conflictTime: Date.now()
    };
  }

  /**
   * Sync individual action based on type
   */
  private async syncSingleAction(action: PendingAction): Promise<void> {
    // Add network delay simulation
    await this.delay(500 + Math.random() * 1000);

    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Network timeout for ${action.type}`);
    }

    // In production, these would be actual API calls
    switch (action.type) {
      case 'team_checkin':
        console.log('📡 API: Team check-in');
        // await api.volunteers.team.checkIn.mutate(action.data);
        break;
        
      case 'player_verification':
        console.log('📡 API: Player verification');
        // await api.volunteers.player.verify.mutate(action.data);
        break;
        
      case 'match_score':
        console.log('📡 API: Match score update');
        // await api.volunteers.match.updateScore.mutate(action.data);
        break;
        
      case 'media_upload':
        console.log('📡 API: Media upload');
        // await api.volunteers.media.upload.mutate(action.data);
        break;
        
      default:
        console.log(`📡 API: ${action.type} sync`);
        break;
    }
  }

  /**
   * Sort actions by priority
   */
  private sortByPriority(actions: PendingAction[]): PendingAction[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...actions].sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  /**
   * Create batches of actions
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Merge local and server data intelligently
   */
  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - in production this would be more sophisticated
    return {
      ...serverData,
      ...localData,
      // Server timestamp wins for conflict resolution
      updatedAt: serverData.updatedAt || localData.updatedAt,
      // Merge arrays if present
      ...(Array.isArray(localData.items) && Array.isArray(serverData.items) && {
        items: [...new Set([...serverData.items, ...localData.items])]
      })
    };
  }

  /**
   * Request manual conflict resolution (placeholder)
   */
  private async requestManualResolution(localData: any, serverData: any): Promise<any> {
    // In production, this would show a UI for manual resolution
    console.log('🔧 Manual conflict resolution required');
    return serverData; // Default to server for now
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const syncService = new EnhancedSyncService();
