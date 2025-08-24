/**
 * Offline-first data service
 * Provides high-level CRUD operations with automatic Firebase sync
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QuerySnapshot,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { getOfflineStorage, OfflineStorage, StorageCollection, StorageResult } from '../storage/offlineStorage';

export interface DataServiceOptions {
  useOfflineFirst?: boolean;
  syncToFirebase?: boolean;
  userId?: string;
  skipCache?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  startAfter?: DocumentSnapshot;
}

export interface SyncStatus {
  lastSync: number;
  pendingActions: number;
  errors: string[];
  isOnline: boolean;
}

export interface DataResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'offline' | 'online' | 'cache';
  timestamp: number;
  needsSync?: boolean;
}

class OfflineDataService {
  private storage: OfflineStorage | null = null;
  private listeners: Map<string, Unsubscribe> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.storage = await getOfflineStorage();
      this.initialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async create<T = any>(
    collection: StorageCollection,
    id: string,
    data: T,
    options: DataServiceOptions = {}
  ): Promise<DataResult<T>> {
    try {
      await this.ensureInitialized();

      const timestamp = Date.now();
      const documentData = {
        ...data,
        id,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Always store offline first
      const storeResult = await this.storage!.store(collection, id, documentData, {
        userId: options.userId,
        useMemoryCache: !options.skipCache
      });

      if (!storeResult.success) {
        return {
          success: false,
          error: storeResult.error,
          source: 'offline',
          timestamp
        };
      }

      // Try to sync to Firebase if online and requested
      if (options.syncToFirebase !== false && navigator.onLine) {
        try {
          const firebaseCollection = collection;
          await setDoc(doc(db, firebaseCollection, id), documentData);
          
          // Mark as synced
          await this.storage!.markAsSynced(collection, [id], { userId: options.userId });
          
          return {
            success: true,
            data: documentData,
            source: 'online',
            timestamp
          };
        } catch (firebaseError) {
          
          // Add to sync queue
          await this.addToSyncQueue({
            id: `${collection}_${id}_${timestamp}`,
            type: 'CREATE',
            collection,
            documentId: id,
            data: documentData,
            timestamp,
            userId: options.userId || '',
            status: 'PENDING',
            retryCount: 0
          });

          return {
            success: true,
            data: documentData,
            source: 'offline',
            timestamp,
            needsSync: true
          };
        }
      }

      // Add to sync queue for later
      await this.addToSyncQueue({
        id: `${collection}_${id}_${timestamp}`,
        type: 'CREATE',
        collection,
        documentId: id,
        data: documentData,
        timestamp,
        userId: options.userId || '',
        status: 'PENDING',
        retryCount: 0
      });

      return {
        success: true,
        data: documentData,
        source: 'offline',
        timestamp,
        needsSync: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Read a document
   */
  async read<T = any>(
    collection: StorageCollection,
    id: string,
    options: DataServiceOptions = {}
  ): Promise<DataResult<T>> {
    try {
      await this.ensureInitialized();

      // Try offline first if requested or if offline
      if (options.useOfflineFirst || !navigator.onLine) {
        const offlineResult = await this.storage!.get(collection, id, {
          userId: options.userId,
          useMemoryCache: !options.skipCache
        });

        if (offlineResult.success && offlineResult.data && !offlineResult.data.deleted) {
          return {
            success: true,
            data: offlineResult.data.data,
            source: offlineResult.fromCache ? 'cache' : 'offline',
            timestamp: offlineResult.timestamp || Date.now()
          };
        }
      }

      // Try Firebase if online
      if (navigator.onLine) {
        try {
          const docRef = doc(db, collection, id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const firebaseData = { id: docSnap.id, ...docSnap.data() };
            
            // Store in offline storage for future use
            await this.storage!.store(collection, id, firebaseData, {
              userId: options.userId,
              useMemoryCache: !options.skipCache
            });

            // Mark as synced since it came from Firebase
            await this.storage!.markAsSynced(collection, [id], { userId: options.userId });

            return {
              success: true,
              data: firebaseData as T,
              source: 'online',
              timestamp: Date.now()
            };
          }
        } catch (firebaseError) {
        }
      }

      // Final offline attempt
      const offlineResult = await this.storage!.get(collection, id, {
        userId: options.userId,
        useMemoryCache: !options.skipCache
      });

      if (offlineResult.success && offlineResult.data && !offlineResult.data.deleted) {
        return {
          success: true,
          data: offlineResult.data.data,
          source: 'offline',
          timestamp: offlineResult.timestamp || Date.now()
        };
      }

      return {
        success: false,
        error: 'Document not found',
        source: 'offline',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update a document
   */
  async update<T = any>(
    collection: StorageCollection,
    id: string,
    data: Partial<T>,
    options: DataServiceOptions = {}
  ): Promise<DataResult<T>> {
    try {
      await this.ensureInitialized();

      // Get existing document
      const existing = await this.read(collection, id, { ...options, useOfflineFirst: true });
      if (!existing.success) {
        return {
          success: false,
          error: 'Document not found for update',
          source: 'offline',
          timestamp: Date.now()
        };
      }

      const timestamp = Date.now();
      const updatedData = {
        ...existing.data,
        ...data,
        updatedAt: timestamp
      };

      // Store offline
      const storeResult = await this.storage!.store(collection, id, updatedData, {
        userId: options.userId,
        useMemoryCache: !options.skipCache
      });

      if (!storeResult.success) {
        return {
          success: false,
          error: storeResult.error,
          source: 'offline',
          timestamp
        };
      }

      // Try to sync to Firebase if online
      if (options.syncToFirebase !== false && navigator.onLine) {
        try {
          const docRef = doc(db, collection, id);
          await updateDoc(docRef, data as any);
          
          // Mark as synced
          await this.storage!.markAsSynced(collection, [id], { userId: options.userId });
          
          return {
            success: true,
            data: updatedData,
            source: 'online',
            timestamp
          };
        } catch (firebaseError) {
        }
      }

      // Add to sync queue
      await this.addToSyncQueue({
        id: `${collection}_${id}_${timestamp}`,
        type: 'UPDATE',
        collection,
        documentId: id,
        data,
        timestamp,
        userId: options.userId || '',
        status: 'PENDING',
        retryCount: 0
      });

      return {
        success: true,
        data: updatedData,
        source: 'offline',
        timestamp,
        needsSync: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Delete a document
   */
  async delete(
    collection: StorageCollection,
    id: string,
    options: DataServiceOptions = {}
  ): Promise<DataResult<void>> {
    try {
      await this.ensureInitialized();

      const timestamp = Date.now();

      // Soft delete offline
      const deleteResult = await this.storage!.delete(collection, id, {
        userId: options.userId
      });

      if (!deleteResult.success) {
        return {
          success: false,
          error: deleteResult.error,
          source: 'offline',
          timestamp
        };
      }

      // Try to sync to Firebase if online
      if (options.syncToFirebase !== false && navigator.onLine) {
        try {
          const docRef = doc(db, collection, id);
          await deleteDoc(docRef);
          
          // Hard delete from offline storage since it's synced
          await this.storage!.hardDelete(collection, id, { userId: options.userId });
          
          return {
            success: true,
            source: 'online',
            timestamp
          };
        } catch (firebaseError) {
        }
      }

      // Add to sync queue
      await this.addToSyncQueue({
        id: `${collection}_${id}_${timestamp}`,
        type: 'DELETE',
        collection,
        documentId: id,
        data: {},
        timestamp,
        userId: options.userId || '',
        status: 'PENDING',
        retryCount: 0
      });

      return {
        success: true,
        source: 'offline',
        timestamp,
        needsSync: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Query documents
   */
  async query<T = any>(
    collectionName: StorageCollection,
    queryOptions: QueryOptions = {},
    options: DataServiceOptions = {}
  ): Promise<DataResult<T[]>> {
    try {
      await this.ensureInitialized();

      // Try offline first if requested or if offline
      if (options.useOfflineFirst || !navigator.onLine) {
        const offlineResult = await this.storage!.getAll(collectionName, {
          userId: options.userId,
          where: queryOptions.filters,
          orderBy: queryOptions.orderBy?.field,
          orderDirection: queryOptions.orderBy?.direction,
          limit: queryOptions.limit
        });

        if (offlineResult.success && offlineResult.data) {
          const filteredData = offlineResult.data
            .filter(doc => !doc.deleted)
            .map(doc => doc.data);

          return {
            success: true,
            data: filteredData,
            source: 'offline',
            timestamp: offlineResult.timestamp || Date.now()
          };
        }
      }

      // Try Firebase if online
      if (navigator.onLine) {
        try {
          let firestoreQuery = collection(db, collectionName) as any;

          // Apply filters
          if (queryOptions.filters) {
            for (const filter of queryOptions.filters) {
              firestoreQuery = query(firestoreQuery, where(filter.field, filter.operator, filter.value));
            }
          }

          // Apply ordering
          if (queryOptions.orderBy) {
            firestoreQuery = query(firestoreQuery, orderBy(queryOptions.orderBy.field, queryOptions.orderBy.direction));
          }

          // Apply limit
          if (queryOptions.limit) {
            firestoreQuery = query(firestoreQuery, limit(queryOptions.limit));
          }

          // Apply startAfter for pagination
          if (queryOptions.startAfter) {
            firestoreQuery = query(firestoreQuery, startAfter(queryOptions.startAfter));
          }

          const querySnapshot = await getDocs(firestoreQuery);
          const firebaseData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...(typeof data === 'object' && data !== null ? data : {})
            };
          });

          // Store results in offline storage
          for (const item of firebaseData) {
            await this.storage!.store(collectionName, item.id, item, {
              userId: options.userId,
              useMemoryCache: !options.skipCache
            });
            await this.storage!.markAsSynced(collectionName, [item.id], { userId: options.userId });
          }

          return {
            success: true,
            data: firebaseData as T[],
            source: 'online',
            timestamp: Date.now()
          };
        } catch (firebaseError) {
        }
      }

      // Final offline attempt
      const offlineResult = await this.storage!.getAll(collectionName, {
        userId: options.userId,
        where: queryOptions.filters,
        orderBy: queryOptions.orderBy?.field,
        orderDirection: queryOptions.orderBy?.direction,
        limit: queryOptions.limit
      });

      if (offlineResult.success && offlineResult.data) {
        const filteredData = offlineResult.data
          .filter(doc => !doc.deleted)
          .map(doc => doc.data);

        return {
          success: true,
          data: filteredData,
          source: 'offline',
          timestamp: offlineResult.timestamp || Date.now()
        };
      }

      return {
        success: true,
        data: [],
        source: 'offline',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'offline',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Listen to real-time changes (when online)
   */
  async listen<T = any>(
    collectionName: StorageCollection,
    id: string,
    callback: (data: T | null) => void,
    options: DataServiceOptions = {}
  ): Promise<() => void> {
    const listenerId = `${collectionName}_${id}`;

    if (navigator.onLine) {
      try {
        const docRef = doc(db, collectionName, id);
        const unsubscribe = onSnapshot(docRef, 
          (doc) => {
            if (doc.exists()) {
              const data = { id: doc.id, ...doc.data() } as T;
              
              // Store in offline storage
              this.storage?.store(collectionName, id, data, {
                userId: options.userId,
                useMemoryCache: !options.skipCache
              });

              callback(data);
            } else {
              callback(null);
            }
          },
          (error) => {
            // Fall back to cached data
            this.read<T>(collectionName, id, { ...options, useOfflineFirst: true })
              .then(result => {
                if (result.success) {
                  callback(result.data || null);
                }
              });
          }
        );

        this.listeners.set(listenerId, unsubscribe);
        return unsubscribe;
      } catch (error) {
        // Failed to setup Firebase listener
      }
    }

    // Offline fallback - return cached data immediately and setup a no-op unsubscriber
    this.read<T>(collectionName, id, { ...options, useOfflineFirst: true })
      .then(result => {
        if (result.success) {
          callback(result.data || null);
        }
      });

    return () => {}; // No-op unsubscribe for offline mode
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId?: string): Promise<SyncStatus> {
    try {
      await this.ensureInitialized();

      const syncQueueResult = await this.storage!.getAll('syncQueue', { userId });
      const pendingActions = syncQueueResult.data?.filter(item => 
        item.data.status === 'PENDING' || item.data.status === 'FAILED'
      ).length || 0;

      const errors = syncQueueResult.data?.filter(item => 
        item.data.status === 'FAILED'
      ).map(item => item.data.error || 'Unknown error') || [];

      return {
        lastSync: Date.now(), // This should be stored as metadata
        pendingActions,
        errors,
        isOnline: navigator.onLine
      };
    } catch (error) {
      return {
        lastSync: 0,
        pendingActions: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        isOnline: navigator.onLine
      };
    }
  }

  /**
   * Force sync all pending changes
   */
  async forcSync(userId?: string): Promise<{ success: boolean; synced: number; failed: number }> {
    // This will be implemented in the sync engine
    return { success: true, synced: 0, failed: 0 };
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async addToSyncQueue(action: any): Promise<void> {
    if (!this.storage) return;

    await this.storage.store('syncQueue', action.id, action, {
      userId: action.userId
    });
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    this.listeners.forEach(unsubscribe => {
      unsubscribe();
    });
    this.listeners.clear();
  }
}

// Singleton instance
let dataServiceInstance: OfflineDataService | null = null;

/**
 * Get the singleton OfflineDataService instance
 */
export const getOfflineDataService = async (): Promise<OfflineDataService> => {
  if (!dataServiceInstance) {
    dataServiceInstance = new OfflineDataService();
    await dataServiceInstance.initialize();
  }
  return dataServiceInstance;
};

export { OfflineDataService };