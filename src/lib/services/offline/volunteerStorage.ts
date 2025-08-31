/**
 * Volunteer-specific IndexedDB storage system
 * Replaces Firebase-focused storage with volunteer workflow optimized schema
 * Supports 50MB per volunteer with intelligent data management
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

// Base document interface for all stored data
export interface VolunteerDocument {
  id: string;
  data: any;
  timestamp: number;
  lastModified: number;
  userId?: string;
  venueId?: string;
  version: number;
  synced: boolean;
  deleted?: boolean;
  priority: 'high' | 'medium' | 'low';
  size: number; // in bytes for memory management
}

// Specific data structures for volunteer workflow
export interface VolunteerAssignment extends VolunteerDocument {
  data: {
    id: string;
    volunteerId: string;
    venueId: string;
    role: string;
    status: 'active' | 'inactive';
    assignedAt: number;
    venueLevelMapping?: {
      venue: {
        id: string;
        name: string;
        location: string;
      };
      level: {
        id: string;
        name: string;
        description: string;
      };
    };
  };
}

export interface TeamRecord extends VolunteerDocument {
  data: {
    id: string;
    name: string;
    sport: string;
    venueId: string;
    status: 'registered' | 'checked_in' | 'competing' | 'eliminated' | 'winner';
    playerCount: number;
    verifiedPlayers: number;
    checkedInAt?: number;
    lastActivity: number;
    players: PlayerRecord[];
    groupStage?: string;
    division?: string;
  };
}

export interface PlayerRecord extends VolunteerDocument {
  data: {
    id: string;
    name: string;
    teamId: string;
    dateOfBirth?: string;
    gender?: 'M' | 'F' | 'O';
    verificationStatus: 'pending' | 'verified' | 'rejected';
    documents: {
      aadhaar?: string;
      photo?: string;
      other?: string[];
    };
    verificationNotes?: string;
    verifiedBy?: string;
    verifiedAt?: number;
    lastUpdated: number;
  };
}

export interface MatchRecord extends VolunteerDocument {
  data: {
    id: string;
    sport: string;
    venueId: string;
    teams: {
      id: string;
      name: string;
      score?: number;
    }[];
    scheduledTime: number;
    actualStartTime?: number;
    actualEndTime?: number;
    status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
    events: MatchEvent[];
    winner?: string;
    notes?: string;
    refereeId?: string;
    lastUpdated: number;
  };
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'foul' | 'yellow_card' | 'red_card' | 'substitution' | 'timeout' | 'other';
  timestamp: number;
  teamId?: string;
  playerId?: string;
  description: string;
  metadata?: any;
}

export interface MediaQueueItem extends VolunteerDocument {
  data: {
    id: string;
    type: 'photo' | 'video' | 'document';
    fileName: string;
    fileSize: number;
    mimeType: string;
    localPath: string; // IndexedDB blob reference
    uploadPath: string; // Server destination
    entityId: string; // Team, player, or match ID
    entityType: 'team' | 'player' | 'match' | 'venue';
    description?: string;
    metadata?: any;
    uploadProgress: number; // 0-100
    uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
    uploadError?: string;
    retryCount: number;
    createdAt: number;
  };
}

export interface SyncQueueAction extends VolunteerDocument {
  data: {
    id: string;
    type: 'team_checkin' | 'player_verification' | 'match_score' | 'match_event' | 'media_upload' | 'other';
    action: 'create' | 'update' | 'delete';
    entityId: string;
    entityType: string;
    payload: any;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
    lastRetry?: number;
    error?: string;
    createdAt: number;
    dependencies?: string[]; // Other action IDs this depends on
  };
}

export interface VenueConfiguration extends VolunteerDocument {
  data: {
    id: string;
    name: string;
    location: string;
    sports: string[];
    capacity: number;
    facilities: string[];
    coordinates?: {
      lat: number;
      lng: number;
    };
    settings: {
      maxTeamsPerSport: number;
      matchDuration: number;
      allowedEventTypes: string[];
    };
    lastUpdated: number;
  };
}

// Volunteer-optimized IndexedDB configuration
export class VolunteerStorageManager {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number;
  private stores: StoreConfig[];

  // Performance-optimized database configuration with composite indexes
  private static readonly DB_CONFIG: DBConfig = {
    name: 'VolunteerWorkflowDB',
    version: 3, // Increment for performance optimizations
    stores: [
      // Volunteer assignments - Critical for role determination
      {
        name: 'volunteerAssignments',
        keyPath: 'id',
        indexes: [
          { name: 'userId', keyPath: 'userId' },
          { name: 'venueId', keyPath: 'venueId' },
          { name: 'status', keyPath: 'data.status' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'synced', keyPath: 'synced' },
          // Composite indexes for common queries
          { name: 'userId_status', keyPath: ['userId', 'data.status'] },
          { name: 'venueId_status', keyPath: ['venueId', 'data.status'] },
          { name: 'synced_timestamp', keyPath: ['synced', 'timestamp'] },
        ]
      },
      
      // Teams - Core volunteer workflow
      {
        name: 'teams',
        keyPath: 'id',
        indexes: [
          { name: 'venueId', keyPath: 'venueId' },
          { name: 'sport', keyPath: 'data.sport' },
          { name: 'status', keyPath: 'data.status' },
          { name: 'checkedIn', keyPath: 'data.checkedInAt' },
          { name: 'lastActivity', keyPath: 'data.lastActivity' },
          { name: 'synced', keyPath: 'synced' },
          { name: 'priority', keyPath: 'priority' },
          // Composite indexes for performance
          { name: 'venueId_status', keyPath: ['venueId', 'data.status'] },
          { name: 'venueId_sport', keyPath: ['venueId', 'data.sport'] },
          { name: 'status_priority', keyPath: ['data.status', 'priority'] },
          { name: 'synced_lastActivity', keyPath: ['synced', 'data.lastActivity'] },
        ]
      },

      // Players - For verification workflow
      {
        name: 'players',
        keyPath: 'id',
        indexes: [
          { name: 'teamId', keyPath: 'data.teamId' },
          { name: 'venueId', keyPath: 'venueId' },
          { name: 'verificationStatus', keyPath: 'data.verificationStatus' },
          { name: 'verifiedBy', keyPath: 'data.verifiedBy' },
          { name: 'lastUpdated', keyPath: 'data.lastUpdated' },
          { name: 'synced', keyPath: 'synced' },
          // Composite indexes for common player queries
          { name: 'teamId_status', keyPath: ['data.teamId', 'data.verificationStatus'] },
          { name: 'venueId_status', keyPath: ['venueId', 'data.verificationStatus'] },
          { name: 'verifiedBy_timestamp', keyPath: ['data.verifiedBy', 'data.lastUpdated'] },
          { name: 'synced_updated', keyPath: ['synced', 'data.lastUpdated'] },
        ]
      },

      // Matches - For scoring and event tracking
      {
        name: 'matches',
        keyPath: 'id',
        indexes: [
          { name: 'venueId', keyPath: 'venueId' },
          { name: 'sport', keyPath: 'data.sport' },
          { name: 'status', keyPath: 'data.status' },
          { name: 'scheduledTime', keyPath: 'data.scheduledTime' },
          { name: 'teams', keyPath: 'data.teams', options: { multiEntry: true } },
          { name: 'lastUpdated', keyPath: 'data.lastUpdated' },
          { name: 'synced', keyPath: 'synced' },
          // Composite indexes for match queries
          { name: 'venueId_date', keyPath: ['venueId', 'data.scheduledTime'] },
          { name: 'venueId_status', keyPath: ['venueId', 'data.status'] },
          { name: 'sport_status', keyPath: ['data.sport', 'data.status'] },
          { name: 'status_time', keyPath: ['data.status', 'data.scheduledTime'] },
        ]
      },

      // Media upload queue - For photos, videos, documents
      {
        name: 'mediaQueue',
        keyPath: 'id',
        indexes: [
          { name: 'uploadStatus', keyPath: 'data.uploadStatus' },
          { name: 'entityId', keyPath: 'data.entityId' },
          { name: 'entityType', keyPath: 'data.entityType' },
          { name: 'type', keyPath: 'data.type' },
          { name: 'priority', keyPath: 'priority' },
          { name: 'createdAt', keyPath: 'data.createdAt' },
          { name: 'fileSize', keyPath: 'data.fileSize' },
          // Composite indexes for media queue optimization
          { name: 'status_priority', keyPath: ['data.uploadStatus', 'priority'] },
          { name: 'entityId_type', keyPath: ['data.entityId', 'data.type'] },
          { name: 'type_status', keyPath: ['data.type', 'data.uploadStatus'] },
          { name: 'size_created', keyPath: ['data.fileSize', 'data.createdAt'] }, // For cleanup
        ]
      },

      // Sync action queue - For offline actions
      {
        name: 'syncQueue',
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'data.status' },
          { name: 'priority', keyPath: 'data.priority' },
          { name: 'type', keyPath: 'data.type' },
          { name: 'entityType', keyPath: 'data.entityType' },
          { name: 'venueId', keyPath: 'venueId' },
          { name: 'userId', keyPath: 'userId' },
          { name: 'createdAt', keyPath: 'data.createdAt' },
          { name: 'retryCount', keyPath: 'data.retryCount' },
          // Composite indexes for sync queue performance
          { name: 'status_priority', keyPath: ['data.status', 'data.priority'] },
          { name: 'status_created', keyPath: ['data.status', 'data.createdAt'] },
          { name: 'type_status', keyPath: ['data.type', 'data.status'] },
          { name: 'userId_type', keyPath: ['userId', 'data.type'] },
          { name: 'retry_created', keyPath: ['data.retryCount', 'data.createdAt'] },
        ]
      },

      // Venue configurations - For sports settings and rules
      {
        name: 'venueConfigs',
        keyPath: 'id',
        indexes: [
          { name: 'name', keyPath: 'data.name' },
          { name: 'lastUpdated', keyPath: 'data.lastUpdated' },
          { name: 'synced', keyPath: 'synced' },
          // Composite indexes for venue configs
          { name: 'synced_updated', keyPath: ['synced', 'data.lastUpdated'] },
        ]
      },

      // Storage metadata - For memory management
      {
        name: 'storageMetadata',
        keyPath: 'key',
        indexes: [
          { name: 'category', keyPath: 'data.category' },
          { name: 'lastAccessed', keyPath: 'data.lastAccessed' },
          { name: 'size', keyPath: 'data.size' },
          // Composite indexes for cleanup optimization
          { name: 'category_accessed', keyPath: ['data.category', 'data.lastAccessed'] },
          { name: 'size_accessed', keyPath: ['data.size', 'data.lastAccessed'] },
        ]
      },

      // Binary data store for media files
      {
        name: 'binaryData',
        keyPath: 'id',
        indexes: [
          { name: 'mediaId', keyPath: 'mediaId' },
          { name: 'size', keyPath: 'size' },
          { name: 'createdAt', keyPath: 'createdAt' },
          // Composite indexes for binary data cleanup
          { name: 'size_created', keyPath: ['size', 'createdAt'] },
        ]
      },

      // Add new stores for background sync components
      {
        name: 'conflicts',
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'data.status' },
          { name: 'userId', keyPath: 'userId' },
          { name: 'entity', keyPath: 'data.entity' },
          { name: 'severity', keyPath: 'data.severity' },
          { name: 'timestamp', keyPath: 'timestamp' },
          // Composite indexes for conflict resolution
          { name: 'status_severity', keyPath: ['data.status', 'data.severity'] },
          { name: 'entity_status', keyPath: ['data.entity', 'data.status'] },
          { name: 'userId_status', keyPath: ['userId', 'data.status'] },
        ]
      },

      {
        name: 'syncEvents',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'data.type' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'userId', keyPath: 'userId' },
          // Composite indexes for event monitoring
          { name: 'type_timestamp', keyPath: ['data.type', 'timestamp'] },
          { name: 'userId_timestamp', keyPath: ['userId', 'timestamp'] },
        ]
      },
    ]
  };

  constructor(config: DBConfig = VolunteerStorageManager.DB_CONFIG) {
    this.dbName = config.name;
    this.version = config.version;
    this.stores = config.stores;
  }

  /**
   * Initialize the database connection with volunteer-optimized schema
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open volunteer database:', request.error);
        this.db = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Volunteer database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.handleUpgrade(db, event.oldVersion, event.newVersion || this.version);
      };
    });
  }

  /**
   * Handle database schema upgrades with volunteer-specific migrations
   */
  private handleUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    console.log(`🔄 Upgrading volunteer database from v${oldVersion} to v${newVersion}`);

    // Create stores that don't exist
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

        console.log(`✅ Created store: ${storeConfig.name}`);
      }
    }

    // Run version-specific migrations
    this.runVolunteerMigrations(db, oldVersion, newVersion);
  }

  /**
   * Volunteer-specific data migrations
   */
  private runVolunteerMigrations(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    // Migration from v1 to v2: Add priority and size tracking
    if (oldVersion < 2) {
      console.log('🔄 Running v2 migration: Adding priority and size tracking');
      
      // Add default priority and size to existing records
      const storeNames = ['teams', 'players', 'matches'];
      storeNames.forEach(storeName => {
        if (db.objectStoreNames.contains(storeName)) {
          // Migration logic would go here in a real implementation
          // For now, we'll let the upgrade complete and handle defaults in the application logic
        }
      });
    }

    // Future migrations will be added here
    // if (oldVersion < 3) { ... }
  }

  /**
   * Store a volunteer document with automatic metadata
   */
  async store<T extends VolunteerDocument>(
    storeName: string,
    document: T,
    options: {
      updateLastModified?: boolean;
      priority?: 'high' | 'medium' | 'low';
      estimatedSize?: number;
    } = {}
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Calculate document size if not provided
    const serializedData = JSON.stringify(document);
    const size = options.estimatedSize || new Blob([serializedData]).size;

    // Prepare document with metadata
    const enrichedDocument: T = {
      ...document,
      lastModified: options.updateLastModified !== false ? Date.now() : document.lastModified,
      priority: options.priority || document.priority || 'medium',
      size,
      timestamp: document.timestamp || Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(enrichedDocument);

      request.onsuccess = async () => {
        // Update storage metadata
        await this.updateStorageMetadata(storeName, size);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`Failed to store document in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve a document by ID
   */
  async get<T extends VolunteerDocument>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = async () => {
        const result = request.result as T | undefined;
        
        // Update last accessed time for LRU cache management
        if (result) {
          await this.updateLastAccessed(storeName, id);
        }
        
        resolve(result || null);
      };
      
      request.onerror = () => {
        console.error(`Failed to get document from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Query documents with volunteer-optimized filters
   */
  async query<T extends VolunteerDocument>(
    storeName: string,
    options: {
      index?: string;
      key?: any;
      range?: IDBKeyRange;
      limit?: number;
      filter?: (doc: T) => boolean;
      orderBy?: 'asc' | 'desc';
    } = {}
  ): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let source: IDBObjectStore | IDBIndex = store;
      if (options.index) {
        source = store.index(options.index);
      }

      const results: T[] = [];
      let request: IDBRequest;

      if (options.range) {
        request = source.openCursor(options.range, options.orderBy === 'desc' ? 'prev' : 'next');
      } else if (options.key !== undefined) {
        request = source.openCursor(IDBKeyRange.only(options.key), options.orderBy === 'desc' ? 'prev' : 'next');
      } else {
        request = source.openCursor(null, options.orderBy === 'desc' ? 'prev' : 'next');
      }

      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          const document = cursor.value as T;
          
          // Apply filter if provided
          if (!options.filter || options.filter(document)) {
            results.push(document);
          }
          
          // Check limit
          if (options.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => {
        console.error(`Failed to query ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a document (soft delete by default)
   */
  async delete(storeName: string, id: string, hardDelete: boolean = false): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (hardDelete) {
      return this.hardDelete(storeName, id);
    }

    // Soft delete - mark as deleted
    const document = await this.get(storeName, id);
    if (document) {
      document.deleted = true;
      document.synced = false;
      document.lastModified = Date.now();
      await this.store(storeName, document);
    }
  }

  /**
   * Permanently delete a document
   */
  private async hardDelete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage by category
   */
  async getStorageUsage(): Promise<{
    total: number;
    byStore: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const usage = {
      total: 0,
      byStore: {} as Record<string, number>,
      byPriority: { high: 0, medium: 0, low: 0 } as Record<string, number>,
    };

    for (const store of this.stores) {
      const documents = await this.query(store.name, {});
      const storeSize = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
      
      usage.byStore[store.name] = storeSize;
      usage.total += storeSize;

      // Group by priority
      documents.forEach(doc => {
        usage.byPriority[doc.priority] += doc.size || 0;
      });
    }

    return usage;
  }

  /**
   * Cleanup old data based on LRU and priority
   */
  async cleanup(targetSizeBytes: number = 45 * 1024 * 1024): Promise<void> {
    const usage = await this.getStorageUsage();
    
    if (usage.total <= targetSizeBytes) {
      console.log('📊 Storage within limits, no cleanup needed');
      return;
    }

    const excessSize = usage.total - targetSizeBytes;
    console.log(`🧹 Starting cleanup: removing ${Math.round(excessSize / 1024 / 1024)}MB`);

    // Cleanup strategy: Remove low priority items first, then by last accessed
    let cleanedSize = 0;
    const priorities = ['low', 'medium', 'high'];

    for (const priority of priorities) {
      if (cleanedSize >= excessSize) break;

      for (const storeName of Object.keys(usage.byStore)) {
        const candidates = await this.query(storeName, {
          filter: (doc) => doc.priority === priority && doc.synced,
          orderBy: 'asc' // Oldest first
        });

        for (const doc of candidates) {
          await this.hardDelete(storeName, doc.id);
          cleanedSize += doc.size || 0;
          
          if (cleanedSize >= excessSize) {
            console.log(`✅ Cleanup complete: removed ${Math.round(cleanedSize / 1024 / 1024)}MB`);
            return;
          }
        }
      }
    }
  }

  /**
   * Update storage metadata for memory management
   */
  private async updateStorageMetadata(storeName: string, sizeChange: number): Promise<void> {
    try {
      const key = `storage_${storeName}`;
      const existing = await this.get('storageMetadata', key);
      
      const metadata = {
        id: key,
        data: {
          category: storeName,
          size: (existing?.data?.size || 0) + sizeChange,
          lastAccessed: Date.now(),
          documentCount: (existing?.data?.documentCount || 0) + 1,
        },
        timestamp: Date.now(),
        lastModified: Date.now(),
        synced: true,
        priority: 'low' as const,
        size: 100, // Small metadata size
      };

      await this.store('storageMetadata', metadata);
    } catch (error) {
      // Don't fail the main operation if metadata update fails
      console.warn('Failed to update storage metadata:', error);
    }
  }

  /**
   * Update last accessed time for LRU management
   */
  private async updateLastAccessed(storeName: string, docId: string): Promise<void> {
    try {
      const key = `access_${storeName}_${docId}`;
      const metadata = {
        id: key,
        data: {
          storeName,
          documentId: docId,
          lastAccessed: Date.now(),
        },
        timestamp: Date.now(),
        lastModified: Date.now(),
        synced: true,
        priority: 'low' as const,
        size: 50,
      };

      await this.store('storageMetadata', metadata);
    } catch (error) {
      // Silent fail for access tracking
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('📱 Volunteer database connection closed');
    }
  }

  /**
   * Delete entire database
   */
  static async deleteDatabase(dbName: string = VolunteerStorageManager.DB_CONFIG.name): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = () => {
        console.log('🗑️ Volunteer database deleted successfully');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('Failed to delete volunteer database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
    });
  }
}

// Singleton instance for volunteer storage
let volunteerStorageInstance: VolunteerStorageManager | null = null;

/**
 * Get the singleton volunteer storage instance
 */
export const getVolunteerStorage = async (): Promise<VolunteerStorageManager> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not available in this environment');
  }
  
  if (!volunteerStorageInstance) {
    volunteerStorageInstance = new VolunteerStorageManager();
    await volunteerStorageInstance.initialize();
  }
  
  return volunteerStorageInstance;
};

export default VolunteerStorageManager;