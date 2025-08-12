/**
 * Smart caching service with TTL, invalidation, and predictive pre-loading
 * Provides intelligent caching strategies based on user patterns
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  source: 'memory' | 'indexeddb' | 'firebase';
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  totalEntries: number;
  memorySize: number;
  hitRate: number;
  averageAccessTime: number;
  topAccessed: string[];
}

export interface PredictiveConfig {
  enabled: boolean;
  maxPrefetchSize: number;
  patternThreshold: number;
  timeWindowMs: number;
}

class SmartCacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private accessPatterns = new Map<string, number[]>();
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    totalEntries: 0,
    memorySize: 0,
    hitRate: 0,
    averageAccessTime: 0,
    topAccessed: []
  };
  
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private cleanupInterval: NodeJS.Timeout | null = null;
  private predictiveConfig: PredictiveConfig = {
    enabled: true,
    maxPrefetchSize: 10,
    patternThreshold: 3,
    timeWindowMs: 30 * 60 * 1000 // 30 minutes
  };

  constructor() {
    this.startPeriodicCleanup();
  }

  /**
   * Set cache entry with intelligent TTL based on data type and usage patterns
   */
  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
      tags?: string[];
      source?: 'memory' | 'indexeddb' | 'firebase';
    } = {}
  ): boolean {
    try {
      const now = Date.now();
      const ttl = this.calculateOptimalTTL(key, options.ttl);
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        accessCount: 1,
        lastAccessed: now,
        source: options.source || 'memory',
        priority: options.priority || 'medium',
        tags: options.tags || []
      };

      // Check memory constraints before adding
      if (this.willExceedMemoryLimit(entry)) {
        this.evictLRU();
      }

      this.memoryCache.set(key, entry);
      this.updateStats();
      this.recordAccess(key);
      
      return true;
    } catch (error) {
      console.error('Failed to set cache entry:', error);
      return false;
    }
  }

  /**
   * Get cache entry with access pattern tracking
   */
  get<T>(key: string): T | null {
    const startTime = Date.now();
    
    try {
      const entry = this.memoryCache.get(key);
      
      if (!entry) {
        this.stats.memoryMisses++;
        this.updateStats();
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.stats.memoryMisses++;
        this.updateStats();
        return null;
      }

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.stats.memoryHits++;
      
      this.recordAccess(key);
      this.updateStats();
      
      // Trigger predictive prefetching
      if (this.predictiveConfig.enabled) {
        this.triggerPredictivePrefetch(key);
      }

      return entry.data as T;
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      return null;
    } finally {
      this.stats.averageAccessTime = 
        (this.stats.averageAccessTime + (Date.now() - startTime)) / 2;
    }
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }
    
    this.updateStats();
    return invalidated;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of Array.from(this.memoryCache.keys())) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }
    
    this.updateStats();
    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessPatterns.clear();
    this.updateStats();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const data = await dataLoader(key);
        this.set(key, data, { 
          priority: 'high',
          ttl: this.defaultTTL * 2 // Longer TTL for warmed data
        });
      } catch (error) {
        console.warn(`Failed to warm up cache for key: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Prefetch data based on access patterns
   */
  async prefetch(keyPatterns: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    if (!this.predictiveConfig.enabled) return;

    const candidateKeys = this.getPrefetchCandidates(keyPatterns);
    const limitedKeys = candidateKeys.slice(0, this.predictiveConfig.maxPrefetchSize);

    const promises = limitedKeys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await dataLoader(key);
          this.set(key, data, { 
            priority: 'low',
            tags: ['prefetched']
          });
        } catch (error) {
          console.warn(`Failed to prefetch data for key: ${key}`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Configure predictive caching
   */
  configurePredictive(config: Partial<PredictiveConfig>): void {
    this.predictiveConfig = { ...this.predictiveConfig, ...config };
  }

  /**
   * Export cache for persistence
   */
  export(): { [key: string]: CacheEntry } {
    const exported: { [key: string]: CacheEntry } = {};
    
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (!this.isExpired(entry) && entry.priority !== 'low') {
        exported[key] = entry;
      }
    }
    
    return exported;
  }

  /**
   * Import cache from persistence
   */
  import(data: { [key: string]: CacheEntry }): number {
    let imported = 0;
    
    for (const [key, entry] of Object.entries(data)) {
      if (!this.isExpired(entry)) {
        this.memoryCache.set(key, entry);
        imported++;
      }
    }
    
    this.updateStats();
    return imported;
  }

  // Private methods

  private calculateOptimalTTL(key: string, requestedTTL?: number): number {
    if (requestedTTL) return requestedTTL;

    // Calculate TTL based on key patterns and access frequency
    const accessPattern = this.accessPatterns.get(key);
    
    if (!accessPattern || accessPattern.length < 2) {
      return this.defaultTTL;
    }

    // More frequently accessed items get longer TTL
    const accessFrequency = accessPattern.length;
    const baseMultiplier = Math.min(accessFrequency / 10, 3);
    
    // Consider data type patterns
    let typeMultiplier = 1;
    if (key.includes('user')) typeMultiplier = 1.5;
    if (key.includes('static')) typeMultiplier = 3;
    if (key.includes('dynamic')) typeMultiplier = 0.5;
    
    return Math.floor(this.defaultTTL * baseMultiplier * typeMultiplier);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private willExceedMemoryLimit(newEntry: CacheEntry): boolean {
    const estimatedSize = this.estimateEntrySize(newEntry);
    return (this.stats.memorySize + estimatedSize) > this.maxMemorySize;
  }

  private estimateEntrySize(entry: CacheEntry): number {
    try {
      return JSON.stringify(entry).length * 2; // Rough estimation
    } catch {
      return 1024; // Default size if can't estimate
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.priority === 'low' && entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    } else {
      // If no low priority items, evict oldest medium priority
      for (const [key, entry] of Array.from(this.memoryCache.entries())) {
        if (entry.priority === 'medium' && entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  private recordAccess(key: string): void {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || [];
    
    // Keep only recent accesses within time window
    const recentAccesses = pattern.filter(
      time => (now - time) <= this.predictiveConfig.timeWindowMs
    );
    
    recentAccesses.push(now);
    this.accessPatterns.set(key, recentAccesses);
  }

  private triggerPredictivePrefetch(accessedKey: string): void {
    // Analyze access patterns to predict next likely accesses
    const patterns = this.analyzeAccessPatterns();
    const candidates = this.predictNextAccesses(accessedKey, patterns);
    
    if (candidates.length > 0) {
      // Trigger prefetch in background (would need data loader callback)
      console.debug('Predictive prefetch candidates:', candidates);
    }
  }

  private analyzeAccessPatterns(): { [sequence: string]: string[] } {
    const sequences: { [sequence: string]: string[] } = {};
    
    // Analyze sequential access patterns
    for (const [key, accesses] of Array.from(this.accessPatterns.entries())) {
      if (accesses.length >= this.predictiveConfig.patternThreshold) {
        // Look for patterns in access sequences
        // This is a simplified implementation
        const recentAccesses = accesses.slice(-5);
        const sequenceKey = recentAccesses.slice(0, -1).join('-');
        
        if (!sequences[sequenceKey]) {
          sequences[sequenceKey] = [];
        }
        sequences[sequenceKey].push(key);
      }
    }
    
    return sequences;
  }

  private predictNextAccesses(currentKey: string, patterns: { [sequence: string]: string[] }): string[] {
    // Simple prediction based on historical patterns
    const candidates: string[] = [];
    
    for (const [sequence, nextKeys] of Object.entries(patterns)) {
      if (sequence.endsWith(currentKey)) {
        candidates.push(...nextKeys);
      }
    }
    
    return Array.from(new Set(candidates)); // Remove duplicates
  }

  private getPrefetchCandidates(patterns: string[]): string[] {
    const candidates: string[] = [];
    
    // Generate candidate keys based on patterns
    for (const pattern of patterns) {
      // This would generate keys based on pattern matching
      // Implementation depends on specific use cases
      candidates.push(...this.generateKeysFromPattern(pattern));
    }
    
    return candidates;
  }

  private generateKeysFromPattern(pattern: string): string[] {
    // Simplified pattern-based key generation
    const keys: string[] = [];
    
    // Example: if pattern is "user:*:profile", generate likely user IDs
    if (pattern.includes('*')) {
      // This would use historical data to generate likely keys
      // For now, return empty array
    }
    
    return keys;
  }

  private updateStats(): void {
    this.stats.totalEntries = this.memoryCache.size;
    this.stats.memorySize = this.calculateMemoryUsage();
    this.stats.hitRate = this.stats.memoryHits / 
      (this.stats.memoryHits + this.stats.memoryMisses || 1);
    this.stats.topAccessed = this.getTopAccessedKeys();
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      totalSize += this.estimateEntrySize(entry);
    }
    
    return totalSize;
  }

  private getTopAccessedKeys(): string[] {
    return Array.from(this.memoryCache.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(entry => entry[0]);
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean old access patterns
    for (const [key, accesses] of Array.from(this.accessPatterns.entries())) {
      const recentAccesses = accesses.filter(
        time => (now - time) <= this.predictiveConfig.timeWindowMs * 2
      );
      
      if (recentAccesses.length === 0) {
        this.accessPatterns.delete(key);
      } else {
        this.accessPatterns.set(key, recentAccesses);
      }
    }
    
    if (cleaned > 0) {
      this.updateStats();
      console.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
  }
}

// Singleton instance
let cacheServiceInstance: SmartCacheService | null = null;

/**
 * Get the singleton SmartCacheService instance
 */
export const getCacheService = (): SmartCacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new SmartCacheService();
  }
  return cacheServiceInstance;
};

export { SmartCacheService };