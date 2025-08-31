/**
 * Storage management utilities for volunteer system
 * Handles monitoring, cleanup, optimization, and health checks
 * Ensures 50MB limit is maintained with intelligent data management
 */

import { getVolunteerStorage, VolunteerDocument } from './volunteerStorage';
import { getVolunteerService } from './volunteerService';

export interface StorageHealth {
  isHealthy: boolean;
  usage: {
    total: number;
    limit: number;
    percentage: number;
    byStore: Record<string, { size: number; count: number; percentage: number }>;
    byPriority: Record<'high' | 'medium' | 'low', number>;
  };
  performance: {
    avgQueryTime: number;
    avgWriteTime: number;
    lastCleanup: number;
    fragmentationLevel: number;
  };
  warnings: string[];
  recommendations: string[];
}

export interface CleanupStrategy {
  targetSize: number;
  preserveRecent: number; // hours
  preserveCritical: boolean;
  preserveUnsynced: boolean;
  aggressiveMode: boolean;
}

export interface OptimizationResult {
  success: boolean;
  sizeBefore: number;
  sizeAfter: number;
  documentsRemoved: number;
  timeMs: number;
  strategies: string[];
  errors: string[];
}

export class StorageManager {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private volunteerService = getVolunteerService();
  
  // Storage limits and thresholds
  private readonly STORAGE_LIMIT = 50 * 1024 * 1024; // 50MB
  private readonly WARNING_THRESHOLD = 0.8; // 80%
  private readonly CRITICAL_THRESHOLD = 0.95; // 95%
  
  // Performance tracking
  private performanceMetrics = {
    queryTimes: [] as number[],
    writeTimes: [] as number[],
    lastCleanup: 0,
  };

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    if (!this.storage) {
      this.storage = await getVolunteerStorage();
    }
  }

  /**
   * Perform comprehensive storage health check
   */
  async checkStorageHealth(): Promise<StorageHealth> {
    await this.initialize();
    
    const startTime = Date.now();
    const usage = await this.storage!.getStorageUsage();
    const queryTime = Date.now() - startTime;
    
    // Track performance
    this.performanceMetrics.queryTimes.push(queryTime);
    if (this.performanceMetrics.queryTimes.length > 100) {
      this.performanceMetrics.queryTimes.shift(); // Keep last 100 measurements
    }

    const totalSize = usage.total;
    const percentage = (totalSize / this.STORAGE_LIMIT) * 100;
    
    // Calculate store percentages
    const byStore: Record<string, { size: number; count: number; percentage: number }> = {};
    for (const [storeName, size] of Object.entries(usage.byStore)) {
      const documents = await this.storage!.query(storeName);
      byStore[storeName] = {
        size,
        count: documents.length,
        percentage: (size / totalSize) * 100,
      };
    }

    // Calculate priority distribution
    const byPriority = { high: 0, medium: 0, low: 0 };
    for (const storeName of Object.keys(usage.byStore)) {
      const documents = await this.storage!.query(storeName);
      documents.forEach(doc => {
        byPriority[doc.priority] += doc.size || 0;
      });
    }

    // Generate warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (percentage > this.CRITICAL_THRESHOLD * 100) {
      warnings.push('Critical: Storage usage above 95% - immediate cleanup required');
      recommendations.push('Run aggressive cleanup to free space');
    } else if (percentage > this.WARNING_THRESHOLD * 100) {
      warnings.push('Warning: Storage usage above 80% - consider cleanup');
      recommendations.push('Schedule regular cleanup to maintain performance');
    }

    // Check for fragmentation
    const fragmentationLevel = this.calculateFragmentation(byStore);
    if (fragmentationLevel > 0.3) {
      warnings.push('High storage fragmentation detected');
      recommendations.push('Consider database optimization');
    }

    // Check for old unsynced data
    const oldUnsyncedCount = await this.getOldUnsyncedCount();
    if (oldUnsyncedCount > 50) {
      warnings.push(`${oldUnsyncedCount} old unsynced items found`);
      recommendations.push('Check network connectivity and sync status');
    }

    const avgQueryTime = this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length;
    const avgWriteTime = this.performanceMetrics.writeTimes.reduce((a, b) => a + b, 0) / Math.max(this.performanceMetrics.writeTimes.length, 1);

    return {
      isHealthy: percentage < this.WARNING_THRESHOLD * 100 && warnings.length === 0,
      usage: {
        total: totalSize,
        limit: this.STORAGE_LIMIT,
        percentage,
        byStore,
        byPriority,
      },
      performance: {
        avgQueryTime,
        avgWriteTime,
        lastCleanup: this.performanceMetrics.lastCleanup,
        fragmentationLevel,
      },
      warnings,
      recommendations,
    };
  }

  /**
   * Optimize storage with intelligent cleanup
   */
  async optimizeStorage(strategy?: Partial<CleanupStrategy>): Promise<OptimizationResult> {
    await this.initialize();
    
    const startTime = Date.now();
    const healthBefore = await this.checkStorageHealth();
    
    const fullStrategy: CleanupStrategy = {
      targetSize: this.STORAGE_LIMIT * 0.7, // Target 70% usage
      preserveRecent: 24, // Preserve last 24 hours
      preserveCritical: true,
      preserveUnsynced: true,
      aggressiveMode: healthBefore.usage.percentage > 95,
      ...strategy,
    };

    const result: OptimizationResult = {
      success: false,
      sizeBefore: healthBefore.usage.total,
      sizeAfter: 0,
      documentsRemoved: 0,
      timeMs: 0,
      strategies: [],
      errors: [],
    };

    try {
      // Strategy 1: Remove old synced low-priority items
      if (healthBefore.usage.total > fullStrategy.targetSize) {
        const removedLowPriority = await this.cleanupLowPriorityData(fullStrategy);
        result.documentsRemoved += removedLowPriority;
        result.strategies.push('Removed old low-priority data');
      }

      // Strategy 2: Clean up completed sync actions
      const removedSyncActions = await this.cleanupCompletedSyncActions();
      result.documentsRemoved += removedSyncActions;
      result.strategies.push('Cleaned up completed sync actions');

      // Strategy 3: Remove old media files if aggressive mode
      if (fullStrategy.aggressiveMode) {
        const removedMedia = await this.cleanupOldMedia(fullStrategy);
        result.documentsRemoved += removedMedia;
        result.strategies.push('Cleaned up old media files');
      }

      // Strategy 4: Compress data if still over limit
      const currentUsage = await this.storage!.getStorageUsage();
      if (currentUsage.total > fullStrategy.targetSize && fullStrategy.aggressiveMode) {
        const compressedCount = await this.compressStoredData();
        result.strategies.push(`Compressed ${compressedCount} documents`);
      }

      // Final health check
      const healthAfter = await this.checkStorageHealth();
      result.sizeAfter = healthAfter.usage.total;
      result.timeMs = Date.now() - startTime;
      result.success = true;

      // Update cleanup timestamp
      this.performanceMetrics.lastCleanup = Date.now();

      console.log('🧹 Storage optimization completed:', {
        sizeBefore: Math.round(result.sizeBefore / 1024 / 1024) + 'MB',
        sizeAfter: Math.round(result.sizeAfter / 1024 / 1024) + 'MB',
        documentsRemoved: result.documentsRemoved,
        strategies: result.strategies.length,
        timeMs: result.timeMs,
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('Storage optimization failed:', error);
    }

    return result;
  }

  /**
   * Clean up low priority data
   */
  private async cleanupLowPriorityData(strategy: CleanupStrategy): Promise<number> {
    const cutoffTime = Date.now() - (strategy.preserveRecent * 60 * 60 * 1000);
    let removedCount = 0;

    const storeNames = ['teams', 'players', 'matches', 'mediaQueue', 'storageMetadata'];
    
    for (const storeName of storeNames) {
      try {
        const documents = await this.storage!.query(storeName, {
          filter: (doc) => {
            // Keep if it's recent
            if (doc.timestamp > cutoffTime) return false;
            
            // Keep if it's unsynced and we're preserving unsynced
            if (!doc.synced && strategy.preserveUnsynced) return false;
            
            // Keep if it's high priority and we're preserving critical
            if (doc.priority === 'high' && strategy.preserveCritical) return false;
            
            // Remove low priority synced items
            return doc.priority === 'low' && doc.synced;
          }
        });

        for (const doc of documents) {
          await this.storage!.delete(storeName, doc.id, true); // Hard delete
          removedCount++;
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${storeName}:`, error);
      }
    }

    return removedCount;
  }

  /**
   * Clean up completed sync actions
   */
  private async cleanupCompletedSyncActions(): Promise<number> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const completedActions = await this.storage!.query('syncQueue', {
      index: 'status',
      key: 'completed',
      filter: (action) => action.timestamp < oneDayAgo
    });

    for (const action of completedActions) {
      await this.storage!.delete('syncQueue', action.id, true);
    }

    return completedActions.length;
  }

  /**
   * Clean up old media files
   */
  private async cleanupOldMedia(strategy: CleanupStrategy): Promise<number> {
    const cutoffTime = Date.now() - (strategy.preserveRecent * 2 * 60 * 60 * 1000); // 2x preserve time for media
    
    const oldMedia = await this.storage!.query('mediaQueue', {
      index: 'uploadStatus',
      key: 'completed',
      filter: (media) => media.timestamp < cutoffTime
    });

    let removedCount = 0;
    for (const media of oldMedia) {
      try {
        // Remove binary data
        await this.storage!.delete('binaryData', media.data.localPath, true);
        // Remove media record
        await this.storage!.delete('mediaQueue', media.id, true);
        removedCount++;
      } catch (error) {
        console.warn(`Failed to remove media ${media.id}:`, error);
      }
    }

    return removedCount;
  }

  /**
   * Compress stored data by removing verbose fields
   */
  private async compressStoredData(): Promise<number> {
    let compressedCount = 0;

    // This is a placeholder for data compression logic
    // In practice, you might remove non-essential fields from documents
    // or implement other compression strategies

    return compressedCount;
  }

  /**
   * Calculate storage fragmentation level
   */
  private calculateFragmentation(byStore: Record<string, { size: number; count: number; percentage: number }>): number {
    // Simple fragmentation calculation based on size vs count ratio
    const entries = Object.values(byStore);
    if (entries.length === 0) return 0;

    const avgSizePerDoc = entries.reduce((sum, store) => sum + store.size, 0) / 
                         entries.reduce((sum, store) => sum + store.count, 0);
    
    const sizeVariance = entries.reduce((variance, store) => {
      const avgPerStore = store.count > 0 ? store.size / store.count : 0;
      return variance + Math.abs(avgPerStore - avgSizePerDoc);
    }, 0) / entries.length;

    // Normalize to 0-1 range
    return Math.min(sizeVariance / avgSizePerDoc, 1);
  }

  /**
   * Get count of old unsynced items
   */
  private async getOldUnsyncedCount(): Promise<number> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let count = 0;

    const storeNames = ['teams', 'players', 'matches', 'syncQueue'];
    
    for (const storeName of storeNames) {
      try {
        const oldUnsynced = await this.storage!.query(storeName, {
          index: 'synced',
          key: false,
          filter: (doc) => doc.timestamp < oneDayAgo
        });
        count += oldUnsynced.length;
      } catch (error) {
        // Some stores might not have synced index
      }
    }

    return count;
  }

  /**
   * Track write performance
   */
  trackWriteTime(timeMs: number): void {
    this.performanceMetrics.writeTimes.push(timeMs);
    if (this.performanceMetrics.writeTimes.length > 100) {
      this.performanceMetrics.writeTimes.shift();
    }
  }

  /**
   * Export storage data for backup
   */
  async exportData(): Promise<{
    timestamp: number;
    version: string;
    stores: Record<string, any[]>;
    metadata: {
      totalSize: number;
      documentCount: number;
    };
  }> {
    await this.initialize();

    const usage = await this.storage!.getStorageUsage();
    const stores: Record<string, any[]> = {};

    // Export all stores
    const storeNames = Object.keys(usage.byStore);
    for (const storeName of storeNames) {
      try {
        stores[storeName] = await this.storage!.query(storeName);
      } catch (error) {
        console.warn(`Failed to export ${storeName}:`, error);
        stores[storeName] = [];
      }
    }

    return {
      timestamp: Date.now(),
      version: '2.0',
      stores,
      metadata: {
        totalSize: usage.total,
        documentCount: Object.values(stores).reduce((sum, docs) => sum + docs.length, 0),
      },
    };
  }

  /**
   * Import storage data from backup
   */
  async importData(backupData: {
    stores: Record<string, any[]>;
    metadata: { totalSize: number; documentCount: number };
  }): Promise<{ success: boolean; imported: number; errors: string[] }> {
    await this.initialize();

    const result = {
      success: false,
      imported: 0,
      errors: [] as string[],
    };

    try {
      for (const [storeName, documents] of Object.entries(backupData.stores)) {
        try {
          for (const doc of documents) {
            await this.storage!.store(storeName, doc);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(`Failed to import ${storeName}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleAutoCleanup(intervalMinutes: number = 60): void {
    setInterval(async () => {
      try {
        const health = await this.checkStorageHealth();
        
        // Only cleanup if usage is above warning threshold
        if (health.usage.percentage > this.WARNING_THRESHOLD * 100) {
          console.log('🧹 Starting scheduled storage cleanup...');
          await this.optimizeStorage();
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`📅 Scheduled automatic cleanup every ${intervalMinutes} minutes`);
  }

  /**
   * Get storage recommendations based on usage patterns
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const health = await this.checkStorageHealth();
    const recommendations: string[] = [];

    // Size-based recommendations
    if (health.usage.percentage > 90) {
      recommendations.push('Critical: Run immediate cleanup to prevent storage overflow');
    } else if (health.usage.percentage > 80) {
      recommendations.push('Consider running storage optimization');
    }

    // Performance-based recommendations
    if (health.performance.avgQueryTime > 100) {
      recommendations.push('Query performance is slow - consider database optimization');
    }

    // Store-specific recommendations
    const largestStore = Object.entries(health.usage.byStore)
      .sort(([, a], [, b]) => b.size - a.size)[0];
    
    if (largestStore && largestStore[1].percentage > 50) {
      recommendations.push(`${largestStore[0]} is using ${Math.round(largestStore[1].percentage)}% of storage - consider targeted cleanup`);
    }

    // Sync-based recommendations
    const oldUnsyncedCount = await this.getOldUnsyncedCount();
    if (oldUnsyncedCount > 20) {
      recommendations.push('Many old unsynced items detected - check network connectivity');
    }

    return recommendations;
  }
}

// Singleton instance
let storageManagerInstance: StorageManager | null = null;

/**
 * Get the singleton storage manager instance
 */
export const getStorageManager = (): StorageManager => {
  if (!storageManagerInstance) {
    storageManagerInstance = new StorageManager();
  }
  return storageManagerInstance;
};

export default StorageManager;