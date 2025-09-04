/**
 * Performance optimization service for offline data management
 * Handles pagination, preloading, memory management, and compression
 */

import { getVolunteerService } from './volunteerService';

export interface PaginationConfig {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PreloadConfig {
  priority: 'critical' | 'high' | 'medium' | 'low';
  maxAge: number; // milliseconds
  backgroundRefresh: boolean;
}

export interface MemoryStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  oldestItem: number;
  newestItem: number;
}

export class PerformanceService {
  private compressionEnabled = true;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private preloadQueue: Map<string, PreloadConfig> = new Map();
  private memoryCache: Map<string, { data: any; timestamp: number; size: number }> = new Map();

  /**
   * Get paginated data with efficient loading
   */
  async getPaginatedTeams(
    venueId: string, 
    userId: string, 
    config: PaginationConfig
  ): Promise<PaginatedResult<any>> {
    const service = getVolunteerService();
    const allTeams = await service.getTeamsForVenue(venueId, userId);
    
    // Sort data
    let sortedTeams = [...allTeams];
    if (config.sortBy) {
      sortedTeams.sort((a, b) => {
        const aVal = a.data[config.sortBy!];
        const bVal = b.data[config.sortBy!];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return config.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Paginate
    const startIndex = (config.page - 1) * config.limit;
    const endIndex = startIndex + config.limit;
    const paginatedData = sortedTeams.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        page: config.page,
        limit: config.limit,
        total: sortedTeams.length,
        totalPages: Math.ceil(sortedTeams.length / config.limit),
        hasNext: endIndex < sortedTeams.length,
        hasPrev: config.page > 1,
      }
    };
  }

  /**
   * Background preload critical data
   */
  async preloadCriticalData(userId: string, venueId: string): Promise<void> {
    console.log('🔄 Starting background preload...');
    
    const preloadTasks = [
      this.preloadTeams(venueId, userId),
      this.preloadMatches(venueId, userId),
      this.preloadVenueData(venueId, userId),
    ];

    // Run preload tasks in background
    Promise.allSettled(preloadTasks).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Preload complete: ${successful}/${results.length} tasks succeeded`);
    });
  }

  /**
   * Intelligent memory management with LRU eviction
   */
  async optimizeMemory(): Promise<MemoryStats> {
    const stats = await this.getMemoryStats();
    
    if (stats.usedSize > this.maxMemorySize * 0.8) { // 80% threshold
      console.log('🧹 Memory optimization triggered');
      await this.evictOldData();
    }

    return stats;
  }

  /**
   * Compress data for storage efficiency
   */
  compressData(data: any): string {
    if (!this.compressionEnabled) return JSON.stringify(data);
    
    try {
      // Simple compression: remove whitespace and common patterns
      const jsonString = JSON.stringify(data);
      const compressed = jsonString
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/{\s*/g, '{') // Remove space after {
        .replace(/\s*}/g, '}') // Remove space before }
        .replace(/\[\s*/g, '[') // Remove space after [
        .replace(/\s*\]/g, ']'); // Remove space before ]
      
      const compressionRatio = (1 - compressed.length / jsonString.length) * 100;
      console.log(`📦 Compressed data: ${compressionRatio.toFixed(1)}% reduction`);
      
      return compressed;
    } catch (error) {
      console.error('❌ Compression failed:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress data
   */
  decompressData(compressedData: string): any {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.error('❌ Decompression failed:', error);
      return null;
    }
  }

  /**
   * Smart caching with TTL and size limits
   */
  async cacheData(key: string, data: any, ttl: number = 300000): Promise<void> { // 5min default TTL
    const compressed = this.compressData(data);
    const size = new Blob([compressed]).size;
    
    // Check if we need to evict data first
    if (this.getTotalCacheSize() + size > this.maxMemorySize) {
      await this.evictLRU(size);
    }

    this.memoryCache.set(key, {
      data: compressed,
      timestamp: Date.now(),
      size
    });

    // Set TTL cleanup
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);
  }

  /**
   * Get cached data with freshness check
   */
  getCachedData(key: string, maxAge: number = 300000): any | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.memoryCache.delete(key);
      return null;
    }

    return this.decompressData(cached.data);
  }

  /**
   * Background data refresh
   */
  async backgroundRefresh(userId: string, venueId: string): Promise<void> {
    console.log('🔄 Background refresh started');
    
    // Refresh critical data in background
    const refreshTasks = [
      this.refreshTeamsData(venueId, userId),
      this.refreshMatchesData(venueId, userId),
      this.refreshSyncQueue(userId),
    ];

    Promise.allSettled(refreshTasks).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Background refresh: ${successful}/${results.length} completed`);
    });
  }

  // Private helper methods

  private async preloadTeams(venueId: string, userId: string): Promise<void> {
    try {
      const service = getVolunteerService();
      const teams = await service.getTeamsForVenue(venueId, userId);
      await this.cacheData(`teams_${venueId}`, teams, 600000); // 10min cache
      console.log(`✅ Preloaded ${teams.length} teams`);
    } catch (error) {
      console.error('❌ Failed to preload teams:', error);
    }
  }

  private async preloadMatches(venueId: string, userId: string): Promise<void> {
    try {
      const service = getVolunteerService();
      const matches = await service.getMatchesForVenue(venueId, undefined, userId);
      await this.cacheData(`matches_${venueId}`, matches, 300000); // 5min cache
      console.log(`✅ Preloaded ${matches.length} matches`);
    } catch (error) {
      console.error('❌ Failed to preload matches:', error);
    }
  }

  private async preloadVenueData(venueId: string, userId: string): Promise<void> {
    try {
      const service = getVolunteerService();
      const venueData = await service.getVenueDetails(venueId, userId);
      await this.cacheData(`venue_${venueId}`, venueData, 900000); // 15min cache
      console.log('✅ Preloaded venue data');
    } catch (error) {
      console.error('❌ Failed to preload venue data:', error);
    }
  }

  private async getMemoryStats(): Promise<MemoryStats> {
    let totalSize = 0;
    let oldestItem = Date.now();
    let newestItem = 0;

    for (const [key, value] of this.memoryCache) {
      totalSize += value.size;
      oldestItem = Math.min(oldestItem, value.timestamp);
      newestItem = Math.max(newestItem, value.timestamp);
    }

    return {
      totalSize,
      usedSize: totalSize,
      availableSize: this.maxMemorySize - totalSize,
      itemCount: this.memoryCache.size,
      oldestItem,
      newestItem,
    };
  }

  private getTotalCacheSize(): number {
    return Array.from(this.memoryCache.values()).reduce((total, item) => total + item.size, 0);
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp); // Oldest first

    let freedSpace = 0;
    for (const [key, value] of entries) {
      this.memoryCache.delete(key);
      freedSpace += value.size;
      
      if (freedSpace >= requiredSpace) break;
    }

    console.log(`🧹 Evicted ${freedSpace} bytes from cache`);
  }

  private async evictOldData(): Promise<void> {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    let evictedCount = 0;

    for (const [key, value] of this.memoryCache) {
      if (value.timestamp < cutoffTime) {
        this.memoryCache.delete(key);
        evictedCount++;
      }
    }

    console.log(`🧹 Evicted ${evictedCount} old cache entries`);
  }

  private async refreshTeamsData(venueId: string, userId: string): Promise<void> {
    // Refresh teams data in background
    await this.preloadTeams(venueId, userId);
  }

  private async refreshMatchesData(venueId: string, userId: string): Promise<void> {
    // Refresh matches data in background
    await this.preloadMatches(venueId, userId);
  }

  private async refreshSyncQueue(userId: string): Promise<void> {
    // Refresh sync queue status
    try {
      const service = getVolunteerService();
      const stats = await service.getStorageStats();
      console.log('✅ Sync queue refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh sync queue:', error);
    }
  }
}

export const performanceService = new PerformanceService();
