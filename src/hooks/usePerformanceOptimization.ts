import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { performanceService, PaginationConfig, PaginatedResult, MemoryStats } from '@/lib/services/offline/performanceService';

export interface PerformanceMetrics {
  memoryStats: MemoryStats | null;
  cacheHitRate: number;
  averageLoadTime: number;
  backgroundTasksActive: number;
}

/**
 * Hook for performance optimization features
 */
export function usePerformanceOptimization() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryStats: null,
    cacheHitRate: 0,
    averageLoadTime: 0,
    backgroundTasksActive: 0,
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const backgroundTasksRef = useRef(0);
  const loadTimesRef = useRef<number[]>([]);

  /**
   * Get paginated data with performance optimization
   */
  const getPaginatedData = useCallback(async <T>(
    dataType: 'teams' | 'matches' | 'players',
    venueId: string,
    config: PaginationConfig
  ): Promise<PaginatedResult<T>> => {
    if (!user?.id) throw new Error('User not authenticated');

    const startTime = Date.now();
    
    try {
      let result: PaginatedResult<any>;
      
      switch (dataType) {
        case 'teams':
          result = await performanceService.getPaginatedTeams(venueId, user.id, config);
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      // Track load time
      const loadTime = Date.now() - startTime;
      loadTimesRef.current.push(loadTime);
      if (loadTimesRef.current.length > 10) {
        loadTimesRef.current.shift(); // Keep only last 10 measurements
      }

      return result;
    } catch (error) {
      console.error(`Failed to get paginated ${dataType}:`, error);
      throw error;
    }
  }, [user?.id]);

  /**
   * Preload critical data in background
   */
  const preloadCriticalData = useCallback(async (venueId: string) => {
    if (!user?.id) return;

    backgroundTasksRef.current++;
    setMetrics(prev => ({ ...prev, backgroundTasksActive: backgroundTasksRef.current }));

    try {
      await performanceService.preloadCriticalData(user.id, venueId);
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    } finally {
      backgroundTasksRef.current--;
      setMetrics(prev => ({ ...prev, backgroundTasksActive: backgroundTasksRef.current }));
    }
  }, [user?.id]);

  /**
   * Optimize memory usage
   */
  const optimizeMemory = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      const memoryStats = await performanceService.optimizeMemory();
      setMetrics(prev => ({ ...prev, memoryStats }));
      console.log('✅ Memory optimization complete');
    } catch (error) {
      console.error('❌ Memory optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  /**
   * Start background refresh
   */
  const startBackgroundRefresh = useCallback(async (venueId: string) => {
    if (!user?.id) return;

    backgroundTasksRef.current++;
    setMetrics(prev => ({ ...prev, backgroundTasksActive: backgroundTasksRef.current }));

    try {
      await performanceService.backgroundRefresh(user.id, venueId);
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      backgroundTasksRef.current--;
      setMetrics(prev => ({ ...prev, backgroundTasksActive: backgroundTasksRef.current }));
    }
  }, [user?.id]);

  /**
   * Get cached data with performance tracking
   */
  const getCachedData = useCallback((key: string, maxAge?: number) => {
    const startTime = Date.now();
    const data = performanceService.getCachedData(key, maxAge);
    const loadTime = Date.now() - startTime;
    
    // Track cache hit/miss
    const isHit = data !== null;
    const currentHitRate = metrics.cacheHitRate;
    const newHitRate = (currentHitRate * 0.9) + (isHit ? 0.1 : 0); // Exponential moving average
    
    setMetrics(prev => ({ ...prev, cacheHitRate: newHitRate }));
    
    return data;
  }, [metrics.cacheHitRate]);

  /**
   * Cache data with compression
   */
  const cacheData = useCallback(async (key: string, data: any, ttl?: number) => {
    try {
      await performanceService.cacheData(key, data, ttl);
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const memoryStats = await performanceService.optimizeMemory();
        const averageLoadTime = loadTimesRef.current.length > 0 
          ? loadTimesRef.current.reduce((sum, time) => sum + time, 0) / loadTimesRef.current.length
          : 0;

        setMetrics(prev => ({
          ...prev,
          memoryStats,
          averageLoadTime,
        }));
      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Auto-optimize memory when needed
  useEffect(() => {
    if (metrics.memoryStats && metrics.memoryStats.usedSize > metrics.memoryStats.totalSize * 0.8) {
      console.log('🧹 Auto-triggering memory optimization');
      optimizeMemory();
    }
  }, [metrics.memoryStats, optimizeMemory]);

  return {
    metrics,
    isOptimizing,
    getPaginatedData,
    preloadCriticalData,
    optimizeMemory,
    startBackgroundRefresh,
    getCachedData,
    cacheData,
  };
}
