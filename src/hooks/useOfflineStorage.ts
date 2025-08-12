/**
 * React hook for offline-first data operations
 * Provides a convenient interface for components to interact with offline storage
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getOfflineDataService, DataServiceOptions, DataResult, QueryOptions, QueryFilter, SyncStatus } from '@/lib/services/offlineDataService';
import { StorageCollection } from '@/lib/storage/offlineStorage';
import { useNetworkStatus } from '@/lib/utils/networkStatus';
import { useAuth } from '@/context/AuthContext';

export interface UseOfflineStorageOptions extends DataServiceOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  cacheKey?: string;
  optimisticUpdates?: boolean;
}

export interface UseOfflineStorageResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: 'offline' | 'online' | 'cache' | null;
  lastUpdated: number | null;
  needsSync: boolean;
  
  // Actions
  create: (id: string, data: T, options?: DataServiceOptions) => Promise<DataResult<T>>;
  read: (id: string, options?: DataServiceOptions) => Promise<DataResult<T>>;
  update: (id: string, data: Partial<T>, options?: DataServiceOptions) => Promise<DataResult<T>>;
  delete: (id: string, options?: DataServiceOptions) => Promise<DataResult<void>>;
  refresh: () => Promise<void>;
  
  // Query operations
  query: (queryOptions?: QueryOptions, options?: DataServiceOptions) => Promise<DataResult<T[]>>;
  
  // Real-time subscriptions
  subscribe: (id: string, options?: DataServiceOptions) => () => void;
  
  // Sync operations
  forceSync: () => Promise<void>;
  getSyncStatus: () => Promise<SyncStatus>;
}

export interface UseOfflineCollectionResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  source: 'offline' | 'online' | 'cache' | null;
  lastUpdated: number | null;
  hasMore: boolean;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (data: T) => Promise<DataResult<T>>;
  update: (id: string, data: Partial<T>) => Promise<DataResult<T>>;
  delete: (id: string) => Promise<DataResult<void>>;
  
  // Filtering and sorting
  setFilters: (filters: QueryFilter[]) => void;
  setSorting: (field: string, direction: 'asc' | 'desc') => void;
  
  // Sync operations
  forceSync: () => Promise<void>;
}

/**
 * Hook for single document operations
 */
export function useOfflineStorage<T = any>(
  collection: StorageCollection,
  documentId?: string,
  options: UseOfflineStorageOptions = {}
): UseOfflineStorageResult<T> {
  const { user } = useAuth();
  const { isOnline, connectionQuality } = useNetworkStatus();
  const [dataService] = useState(() => getOfflineDataService());
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'offline' | 'online' | 'cache' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [needsSync, setNeedsSync] = useState(false);

  const defaultOptions = useMemo<DataServiceOptions>(() => ({
    userId: user?.uid,
    useOfflineFirst: !isOnline || connectionQuality === 'poor',
    syncToFirebase: isOnline,
    ...options
  }), [user?.uid, isOnline, connectionQuality, options]);

  // Auto-fetch data when documentId is provided
  useEffect(() => {
    if (options.autoFetch !== false && documentId) {
      fetchData();
    }
  }, [documentId, user?.uid]);

  // Set up refresh interval
  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(() => {
        if (isOnline && documentId) {
          fetchData();
        }
      }, options.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [options.refreshInterval, isOnline, documentId]);

  const fetchData = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const service = await dataService;
      const result = await service.read<T>(collection, documentId, defaultOptions);
      
      if (result.success) {
        setData(result.data || null);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setNeedsSync(result.needsSync || false);
      } else {
        setError(result.error || 'Failed to fetch data');
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [collection, documentId, defaultOptions, dataService]);

  const create = useCallback(async (id: string, newData: T, createOptions?: DataServiceOptions): Promise<DataResult<T>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.create<T>(collection, id, newData, {
        ...defaultOptions,
        ...createOptions
      });
      
      if (result.success && options.optimisticUpdates !== false) {
        setData(result.data || null);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setNeedsSync(result.needsSync || false);
      }
      
      if (!result.success) {
        setError(result.error || 'Create failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const read = useCallback(async (id: string, readOptions?: DataServiceOptions): Promise<DataResult<T>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.read<T>(collection, id, {
        ...defaultOptions,
        ...readOptions
      });
      
      if (result.success) {
        setData(result.data || null);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setNeedsSync(result.needsSync || false);
      } else {
        setError(result.error || 'Read failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService]);

  const update = useCallback(async (id: string, updateData: Partial<T>, updateOptions?: DataServiceOptions): Promise<DataResult<T>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.update<T>(collection, id, updateData, {
        ...defaultOptions,
        ...updateOptions
      });
      
      if (result.success && options.optimisticUpdates !== false) {
        setData(result.data || null);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setNeedsSync(result.needsSync || false);
      }
      
      if (!result.success) {
        setError(result.error || 'Update failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const deleteDoc = useCallback(async (id: string, deleteOptions?: DataServiceOptions): Promise<DataResult<void>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.delete(collection, id, {
        ...defaultOptions,
        ...deleteOptions
      });
      
      if (result.success && options.optimisticUpdates !== false) {
        setData(null);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setNeedsSync(result.needsSync || false);
      }
      
      if (!result.success) {
        setError(result.error || 'Delete failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const query = useCallback(async (queryOptions?: QueryOptions, queryServiceOptions?: DataServiceOptions): Promise<DataResult<T[]>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.query<T>(collection, queryOptions, {
        ...defaultOptions,
        ...queryServiceOptions
      });
      
      if (!result.success) {
        setError(result.error || 'Query failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now(),
        data: []
      };
    }
  }, [collection, defaultOptions, dataService]);

  const subscribe = useCallback((id: string, subscribeOptions?: DataServiceOptions): (() => void) => {
    let unsubscribe: (() => void) | null = null;
    
    dataService.then(service => {
      service.listen<T>(collection, id, (newData) => {
        if (newData) {
          setData(newData);
          setSource('online');
          setLastUpdated(Date.now());
          setNeedsSync(false);
        }
      }, {
        ...defaultOptions,
        ...subscribeOptions
      }).then(unsub => {
        unsubscribe = unsub;
      });
    });
    
    return () => {
      unsubscribe?.();
    };
  }, [collection, defaultOptions, dataService]);

  const refresh = useCallback(async () => {
    if (documentId) {
      await fetchData();
    }
  }, [fetchData, documentId]);

  const forceSync = useCallback(async () => {
    try {
      const service = await dataService;
      await service.forcSync(user?.uid);
      if (documentId) {
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  }, [dataService, user?.uid, documentId, fetchData]);

  const getSyncStatus = useCallback(async (): Promise<SyncStatus> => {
    try {
      const service = await dataService;
      return await service.getSyncStatus(user?.uid);
    } catch (err) {
      return {
        lastSync: 0,
        pendingActions: 0,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        isOnline: false
      };
    }
  }, [dataService, user?.uid]);

  return {
    data,
    loading,
    error,
    source,
    lastUpdated,
    needsSync,
    create,
    read,
    update,
    delete: deleteDoc,
    query,
    subscribe,
    refresh,
    forceSync,
    getSyncStatus
  };
}

/**
 * Hook for collection operations with pagination and filtering
 */
export function useOfflineCollection<T = any>(
  collection: StorageCollection,
  options: UseOfflineStorageOptions & {
    pageSize?: number;
    initialFilters?: QueryFilter[];
    initialSort?: { field: string; direction: 'asc' | 'desc' };
  } = {}
): UseOfflineCollectionResult<T> {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [dataService] = useState(() => getOfflineDataService());
  
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'offline' | 'online' | 'cache' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [filters, setFilters] = useState<QueryFilter[]>(options.initialFilters || []);
  const [sorting, setSorting] = useState<{ field: string; direction: 'asc' | 'desc' } | undefined>(options.initialSort);
  const [currentOffset, setCurrentOffset] = useState(0);
  
  const pageSize = options.pageSize || 20;

  const defaultOptions = useMemo<DataServiceOptions>(() => ({
    userId: user?.uid,
    useOfflineFirst: !isOnline,
    syncToFirebase: isOnline,
    ...options
  }), [user?.uid, isOnline, options]);

  const fetchItems = useCallback(async (offset: number = 0, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const service = await dataService;
      const queryOptions: QueryOptions = {
        filters,
        orderBy: sorting,
        limit: pageSize,
        // @ts-expect-error: 'offset' is not in QueryOptions type, but supported by our service
        offset
      };

      const result = await service.query<T>(collection, queryOptions, defaultOptions);
      if (result.success) {
        const newItems = result.data || [];
        setItems(prev => append ? [...prev, ...newItems] : newItems);
        setSource(result.source);
        setLastUpdated(result.timestamp);
        setHasMore(newItems.length === pageSize);
        setCurrentOffset(append ? offset : 0);
      } else {
        setError(result.error || 'Failed to fetch items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collection, filters, sorting, pageSize, defaultOptions, dataService]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchItems(0, false);
    }
  }, [filters, sorting, user?.uid]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextOffset = currentOffset + pageSize;
    await fetchItems(nextOffset, true);
  }, [hasMore, loading, currentOffset, pageSize, fetchItems]);

  const refresh = useCallback(async () => {
    await fetchItems(0, false);
  }, [fetchItems]);

  const create = useCallback(async (data: T): Promise<DataResult<T>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const id = `temp_${Date.now()}`;
      const result = await service.create<T>(collection, id, data, defaultOptions);
      
      if (result.success && options.optimisticUpdates !== false) {
        setItems(prev => [result.data as T, ...prev]);
        setLastUpdated(result.timestamp);
      }
      
      if (!result.success) {
        setError(result.error || 'Create failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const update = useCallback(async (id: string, data: Partial<T>): Promise<DataResult<T>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.update<T>(collection, id, data, defaultOptions);
      
      if (result.success && options.optimisticUpdates !== false) {
        setItems(prev => prev.map(item => 
          (item as any).id === id ? { ...item, ...result.data } : item
        ));
        setLastUpdated(result.timestamp);
      }
      
      if (!result.success) {
        setError(result.error || 'Update failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const deleteItem = useCallback(async (id: string): Promise<DataResult<void>> => {
    setError(null);
    
    try {
      const service = await dataService;
      const result = await service.delete(collection, id, defaultOptions);
      
      if (result.success && options.optimisticUpdates !== false) {
        setItems(prev => prev.filter(item => (item as any).id !== id));
        setLastUpdated(result.timestamp);
      }
      
      if (!result.success) {
        setError(result.error || 'Delete failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      return {
        success: false,
        error,
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }, [collection, defaultOptions, dataService, options.optimisticUpdates]);

  const forceSync = useCallback(async () => {
    try {
      const service = await dataService;
      await service.forcSync(user?.uid);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  }, [dataService, user?.uid, refresh]);

  const setFiltersCallback = useCallback((newFilters: QueryFilter[]) => {
    setFilters(newFilters);
    setCurrentOffset(0);
  }, []);

  const setSortingCallback = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSorting({ field, direction });
    setCurrentOffset(0);
  }, []);

  return {
    items,
    loading,
    error,
    source,
    lastUpdated,
    hasMore,
    loadMore,
    refresh,
    create,
    update,
    delete: deleteItem,
    setFilters: setFiltersCallback,
    setSorting: setSortingCallback,
    forceSync
  };
}