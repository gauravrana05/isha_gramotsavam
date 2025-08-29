/**
 * IndexedDB wrapper with schema versioning and automatic migration
 * Provides a robust offline storage solution for the Isha Gramotsavam app
 */

export interface DBConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: IndexConfig[];
  autoIncrement?: boolean;
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: {
    unique?: boolean;
    multiEntry?: boolean;
  };
}

export interface OfflineDocument {
  id: string;
  data: any;
  timestamp: number;
  userId?: string;
  version: number;
  deleted?: boolean;
  synced?: boolean;
  lastModified: number;
}

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  documentId: string;
  data: any;
  timestamp: number;
  userId: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  error?: string;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number;
  private stores: StoreConfig[];

  // App-specific database configuration
  private static readonly DB_CONFIG: DBConfig = {
    name: 'IshaGramotsavamOfflineDB',
    version: 1,
    stores: [
      {
        name: 'users',
        keyPath: 'id',
        indexes: [
          { name: 'userId', keyPath: 'userId' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'teams',
        keyPath: 'id',
        indexes: [
          { name: 'userId', keyPath: 'userId' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'sports',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'venues',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'fixtures',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'matches',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' }
        ]
      },
      {
        name: 'syncQueue',
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'status' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'userId', keyPath: 'userId' },
          { name: 'collection', keyPath: 'collection' }
        ]
      },
      {
        name: 'metadata',
        keyPath: 'key',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' }
        ]
      }
    ]
  };

  constructor(config: DBConfig = IndexedDBManager.DB_CONFIG) {
    this.dbName = config.name;
    this.version = config.version;
    this.stores = config.stores;
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        // Error handling removed
        this.db = null; // Ensure db is null on error
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Console log removed
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.handleUpgrade(db, event.oldVersion, event.newVersion || this.version);
      };
    });
  }

  /**
   * Handle database schema upgrades
   */
  private handleUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    // Console log removed

    // Create stores that don&apos;t exist
    for (const storeConfig of this.stores) {
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement || false
        });

        // Create indexes
        if (storeConfig.indexes) {
          for (const indexConfig of storeConfig.indexes) {
            store.createIndex(
              indexConfig.name,
              indexConfig.keyPath,
              indexConfig.options || {}
            );
          }
        }

        // Console log removed
      }
    }

    // Handle version-specific migrations
    this.runMigrations(db, oldVersion, newVersion);
  }

  /**
   * Run version-specific data migrations
   */
  private runMigrations(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    // Future migrations will go here
    // Example:
    // if (oldVersion < 2) {
    //   // Migration for version 2
    // }
  }

  /**
   * Generic method to add/update a document
   */
  async put(storeName: string, document: OfflineDocument): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put({
        ...document,
        lastModified: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a document by ID
   */
  async get(storeName: string, id: string): Promise<OfflineDocument | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as OfflineDocument | undefined;
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all documents from a store
   */
  async getAll(storeName: string): Promise<OfflineDocument[]> {
    if (!this.db) {
      // Warning removed
      return [];
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          // Warning removed
          resolve([]); // Return empty array instead of rejecting
        };

        transaction.onerror = () => {
          // Warning removed
          resolve([]); // Return empty array instead of rejecting
        };
      } catch (error) {
        // Warning removed
        resolve([]); // Return empty array instead of rejecting
      }
    });
  }

  /**
   * Query documents using an index
   */
  async queryByIndex(
    storeName: string, 
    indexName: string, 
    key: any,
    limit?: number
  ): Promise<OfflineDocument[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key, limit);

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a document
   */
  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Count documents in a store
   */
  async count(storeName: string): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute a transaction with multiple operations
   */
  async transaction<T>(
    storeNames: string[],
    mode: IDBTransactionMode,
    callback: (stores: { [storeName: string]: IDBObjectStore }) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, mode);
      
      const stores: { [storeName: string]: IDBObjectStore } = {};
      storeNames.forEach(name => {
        stores[name] = transaction.objectStore(name);
      });

      transaction.oncomplete = () => {
        // Transaction completed successfully
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      // Execute the callback
      callback(stores).then(resolve).catch(reject);
    });
  }

  /**
   * Get database size information
   */
  async getDatabaseInfo(): Promise<{
    name: string;
    version: number;
    stores: { [storeName: string]: number };
    totalSize: number;
  }> {
    const info = {
      name: this.dbName,
      version: this.version,
      stores: {} as { [storeName: string]: number },
      totalSize: 0
    };

    for (const storeConfig of this.stores) {
      const count = await this.count(storeConfig.name);
      info.stores[storeConfig.name] = count;
      info.totalSize += count;
    }

    return info;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      // Console log removed
    }
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(dbName: string = IndexedDBManager.DB_CONFIG.name): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = () => {
        // Console log removed
        resolve();
      };
      
      deleteRequest.onerror = () => {
        // Error handling removed
        reject(deleteRequest.error);
      };
    });
  }
}

// Singleton instance
let dbInstance: IndexedDBManager | null = null;

/**
 * Get the singleton IndexedDB instance
 */
export const getIndexedDB = async (): Promise<IndexedDBManager> => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not available in this environment');
  }
  
  if (!dbInstance) {
    dbInstance = new IndexedDBManager();
    await dbInstance.initialize();
  }
  return dbInstance;
};

export { IndexedDBManager };