/**
 * Unified offline storage interface
 * Provides a clean API for all storage operations with automatic fallback strategies
 */

import { getIndexedDB, IndexedDBManager, OfflineDocument, SyncAction } from './indexedDB';

export type StorageCollection = 
  | 'users' 
  | 'teams' 
  | 'sports' 
  | 'venues' 
  | 'fixtures' 
  | 'matches' 
  | 'syncQueue' 
  | 'metadata';

export interface StorageOptions {
  userId?: string;
  useMemoryCache?: boolean;
  skipIndexedDB?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: {
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
    value: any;
  }[];
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  timestamp?: number;
}

class OfflineStorage {
  private db: IndexedDBManager | null = null;
  private memoryCache: Map<string, { data: any; timestamp: number; ttl?: number }> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Only initialize IndexedDB in browser environment
      if (typeof window !== 'undefined') {
        this.db = await getIndexedDB();
        console.log('OfflineStorage initialized successfully with IndexedDB');
      } else {
        console.log('OfflineStorage initialized in server environment (memory cache only)');
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize IndexedDB, falling back to memory cache only:', error);
      // Continue with just memory cache - don't throw error
      this.db = null;
      this.initialized = true;
    }
  }

  /**
   * Store a document with automatic versioning and metadata
   */
  async store(
    collection: StorageCollection,
    id: string,
    data: any,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    try {
      await this.ensureInitialized();

      const document: OfflineDocument = {
        id,
        data,
        timestamp: Date.now(),
        userId: options.userId,
        version: 1,
        synced: false,
        lastModified: Date.now()
      };

      // Check if document exists to increment version
      const existing = await this.get(collection, id, { skipIndexedDB: false, useMemoryCache: false });
      if (existing.success && existing.data) {
        document.version = existing.data.version + 1;
      }

      // Store in IndexedDB
      if (!options.skipIndexedDB && this.db) {
        await this.db.put(collection, document);
      }

      // Store in memory cache
      if (options.useMemoryCache !== false) {
        const cacheKey = `${collection}:${id}`;
        this.memoryCache.set(cacheKey, {
          data: document,
          timestamp: Date.now(),
          ttl: options.ttl
        });
      }

      return { success: true, timestamp: document.timestamp };
    } catch (error) {
      console.error(`Failed to store document in ${collection}:${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Retrieve a document with intelligent caching
   */
  async get(
    collection: StorageCollection,
    id: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<OfflineDocument>> {
    try {
      await this.ensureInitialized();

      const cacheKey = `${collection}:${id}`;

      // Check memory cache first
      if (options.useMemoryCache !== false) {
        const cached = this.memoryCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          return { 
            success: true, 
            data: cached.data, 
            fromCache: true,
            timestamp: cached.timestamp
          };
        }
      }

      // Fall back to IndexedDB
      if (!options.skipIndexedDB && this.db) {
        const document = await this.db.get(collection, id);
        if (document) {
          // Update memory cache
          if (options.useMemoryCache !== false) {
            this.memoryCache.set(cacheKey, {
              data: document,
              timestamp: Date.now(),
              ttl: options.ttl
            });
          }

          return { 
            success: true, 
            data: document,
            timestamp: document.timestamp
          };
        }
      }

      return { success: false, error: 'Document not found' };
    } catch (error) {
      console.error(`Failed to get document from ${collection}:${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all documents from a collection
   */
  async getAll(
    collection: StorageCollection,
    options: StorageOptions & QueryOptions = {}
  ): Promise<StorageResult<OfflineDocument[]>> {
    try {
      await this.ensureInitialized();

      if (!this.db) {
        return { success: false, error: 'Database not available' };
      }

      let documents = await this.db.getAll(collection);

      // Apply filters
      if (options.where) {
        documents = this.applyFilters(documents, options.where);
      }

      // Apply user filter if specified
      if (options.userId) {
        documents = documents.filter(doc => doc.userId === options.userId);
      }

      // Apply sorting
      if (options.orderBy) {
        documents = this.applySorting(documents, options.orderBy, options.orderDirection);
      }

      // Apply pagination
      if (options.offset || options.limit) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        documents = documents.slice(start, end);
      }

      return { 
        success: true, 
        data: documents,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get all documents from ${collection}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Query documents by index
   */
  async queryByIndex(
    collection: StorageCollection,
    indexName: string,
    key: any,
    options: StorageOptions & QueryOptions = {}
  ): Promise<StorageResult<OfflineDocument[]>> {
    try {
      await this.ensureInitialized();

      if (!this.db) {
        return { success: false, error: 'Database not available' };
      }

      let documents = await this.db.queryByIndex(collection, indexName, key, options.limit);

      // Apply additional filters
      if (options.where) {
        documents = this.applyFilters(documents, options.where);
      }

      return { 
        success: true, 
        data: documents,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to query ${collection} by index ${indexName}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete a document
   */
  async delete(
    collection: StorageCollection,
    id: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    try {
      await this.ensureInitialized();

      // Soft delete: mark as deleted instead of actually removing
      const existing = await this.get(collection, id, options);
      if (existing.success && existing.data) {
        const deletedDocument: OfflineDocument = {
          ...existing.data,
          deleted: true,
          lastModified: Date.now(),
          version: existing.data.version + 1,
          synced: false
        };

        if (this.db) {
          await this.db.put(collection, deletedDocument);
        }

        // Remove from memory cache
        const cacheKey = `${collection}:${id}`;
        this.memoryCache.delete(cacheKey);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document from ${collection}:${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Hard delete a document (permanently remove)
   */
  async hardDelete(
    collection: StorageCollection,
    id: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    try {
      await this.ensureInitialized();

      if (this.db) {
        await this.db.delete(collection, id);
      }

      // Remove from memory cache
      const cacheKey = `${collection}:${id}`;
      this.memoryCache.delete(cacheKey);

      return { success: true };
    } catch (error) {
      console.error(`Failed to hard delete document from ${collection}:${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get unsynced documents for a collection
   */
  async getUnsyncedDocuments(
    collection: StorageCollection,
    userId?: string
  ): Promise<StorageResult<OfflineDocument[]>> {
    try {
      await this.ensureInitialized();

      if (!this.db) {
        return { success: false, error: 'Database not available' };
      }

      let documents = await this.db.queryByIndex(collection, 'synced', false);

      if (userId) {
        documents = documents.filter(doc => doc.userId === userId);
      }

      return { 
        success: true, 
        data: documents,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get unsynced documents from ${collection}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark documents as synced
   */
  async markAsSynced(
    collection: StorageCollection,
    ids: string[],
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    try {
      await this.ensureInitialized();

      if (!this.db) {
        return { success: false, error: 'Database not available' };
      }

      for (const id of ids) {
        const existing = await this.get(collection, id, { ...options, useMemoryCache: false });
        if (existing.success && existing.data) {
          const syncedDocument: OfflineDocument = {
            ...existing.data,
            synced: true,
            lastModified: Date.now()
          };

          await this.db.put(collection, syncedDocument);

          // Update memory cache
          const cacheKey = `${collection}:${id}`;
          if (this.memoryCache.has(cacheKey)) {
            this.memoryCache.set(cacheKey, {
              data: syncedDocument,
              timestamp: Date.now(),
              ttl: options.ttl
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to mark documents as synced in ${collection}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear all data from a collection
   */
  async clearCollection(collection: StorageCollection): Promise<StorageResult<void>> {
    try {
      await this.ensureInitialized();

      if (this.db) {
        await this.db.clear(collection);
      }

      // Clear related memory cache entries
      for (const [key] of Array.from(this.memoryCache.entries())) {
        if (key.startsWith(`${collection}:`)) {
          this.memoryCache.delete(key);
        }
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to clear collection ${collection}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageInfo(): Promise<StorageResult<{
    collections: { [collection: string]: number };
    totalDocuments: number;
    memoryCache: number;
    unsyncedDocuments: { [collection: string]: number };
  }>> {
    try {
      await this.ensureInitialized();

      if (!this.db) {
        return { success: false, error: 'Database not available' };
      }

      const dbInfo = await this.db.getDatabaseInfo();
      const unsyncedCounts: { [collection: string]: number } = {};

      // Get unsynced document counts
      const collections: StorageCollection[] = ['users', 'teams', 'sports', 'venues', 'fixtures', 'matches'];
      for (const collection of collections) {
        const unsynced = await this.getUnsyncedDocuments(collection);
        unsyncedCounts[collection] = unsynced.data?.length || 0;
      }

      return {
        success: true,
        data: {
          collections: dbInfo.stores,
          totalDocuments: dbInfo.totalSize,
          memoryCache: this.memoryCache.size,
          unsyncedDocuments: unsyncedCounts
        }
      };
    } catch (error) {
      console.error('Failed to get storage info', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.memoryCache.entries())) {
      if (value.ttl && (now - value.timestamp) > value.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all memory cache
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private isCacheValid(cached: { data: any; timestamp: number; ttl?: number }): boolean {
    if (!cached.ttl) return true;
    return (Date.now() - cached.timestamp) < cached.ttl;
  }

  private applyFilters(
    documents: OfflineDocument[],
    filters: { field: string; operator: string; value: any }[]
  ): OfflineDocument[] {
    return documents.filter(doc => {
      return filters.every(filter => {
        const fieldValue = this.getNestedValue(doc, filter.field);
        
        switch (filter.operator) {
          case '==': return fieldValue === filter.value;
          case '!=': return fieldValue !== filter.value;
          case '>': return fieldValue > filter.value;
          case '<': return fieldValue < filter.value;
          case '>=': return fieldValue >= filter.value;
          case '<=': return fieldValue <= filter.value;
          default: return true;
        }
      });
    });
  }

  private applySorting(
    documents: OfflineDocument[],
    orderBy: string,
    direction: 'asc' | 'desc' = 'asc'
  ): OfflineDocument[] {
    return documents.sort((a, b) => {
      const aValue = this.getNestedValue(a, orderBy);
      const bValue = this.getNestedValue(b, orderBy);
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Singleton instance
let storageInstance: OfflineStorage | null = null;

/**
 * Get the singleton OfflineStorage instance
 */
export const getOfflineStorage = async (): Promise<OfflineStorage> => {
  if (!storageInstance) {
    storageInstance = new OfflineStorage();
    await storageInstance.initialize();
  }
  return storageInstance;
};

export { OfflineStorage };