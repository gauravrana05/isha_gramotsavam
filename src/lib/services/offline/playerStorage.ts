/**
 * Player-specific IndexedDB storage system
 * Follows captain storage patterns for consistency
 * Optimized for player team membership and match viewing
 */

export interface PlayerDocument {
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
  size: number;
}

export interface PlayerTeamRecord extends PlayerDocument {
  data: {
    id: string;
    name: string;
    sport: string;
    status: 'draft' | 'submitted' | 'verified' | 'rejected';
    captainId: string;
    captainName: string;
    currentPlayers: number;
    venueId?: string;
    players: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      position: 'captain' | 'player';
      verificationStatus: 'pending' | 'verified' | 'rejected';
    }>;
  };
}

export interface PlayerMatchRecord extends PlayerDocument {
  data: {
    id: string;
    team1Id: string;
    team2Id: string;
    team1Name: string;
    team2Name: string;
    team1Score?: number;
    team2Score?: number;
    scheduledTime: string;
    status: 'scheduled' | 'live' | 'completed' | 'cancelled';
    venueId: string;
    venueName?: string;
  };
}

export interface SyncQueueAction {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  userId: string;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

const PLAYER_DB_CONFIG = {
  name: 'PlayerOfflineDB',
  version: 1,
  stores: [
    {
      name: 'teams',
      keyPath: 'id',
      indexes: [
        { name: 'captainId', keyPath: 'data.captainId' },
        { name: 'status', keyPath: 'data.status' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'matches',
      keyPath: 'id',
      indexes: [
        { name: 'team1Id', keyPath: 'data.team1Id' },
        { name: 'team2Id', keyPath: 'data.team2Id' },
        { name: 'status', keyPath: 'data.status' },
        { name: 'scheduledTime', keyPath: 'data.scheduledTime' }
      ]
    },
    {
      name: 'notifications',
      keyPath: 'id',
      indexes: [
        { name: 'userId', keyPath: 'userId' },
        { name: 'read', keyPath: 'data.read' },
        { name: 'type', keyPath: 'data.type' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'profile',
      keyPath: 'id',
      indexes: [
        { name: 'userId', keyPath: 'userId' }
      ]
    },
    {
      name: 'syncQueue',
      keyPath: 'id',
      indexes: [
        { name: 'userId', keyPath: 'userId' },
        { name: 'priority', keyPath: 'priority' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'metadata',
      keyPath: 'key'
    }
  ]
};

class PlayerStorageManager {
  private db: IDBDatabase | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${PLAYER_DB_CONFIG.name}_${this.userId}`, PLAYER_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        PLAYER_DB_CONFIG.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            
            storeConfig.indexes?.forEach(indexConfig => {
              store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
            });
          }
        });
      };
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    // Remove old data to manage storage size
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const stores = ['matches', 'notifications'];
    
    for (const storeName of stores) {
      try {
        const allData = await this.getAll(storeName);
        const oldData = allData.filter(item => item.timestamp < cutoffTime);
        
        for (const item of oldData) {
          await this.delete(storeName, item.id);
        }
      } catch (error) {
        console.error(`Error cleaning up ${storeName}:`, error);
      }
    }
  }
}

// Global storage instances
const playerStorageInstances = new Map<string, PlayerStorageManager>();

export async function getPlayerStorage(userId: string): Promise<PlayerStorageManager> {
  if (!playerStorageInstances.has(userId)) {
    const storage = new PlayerStorageManager(userId);
    await storage.init();
    playerStorageInstances.set(userId, storage);
  }
  
  return playerStorageInstances.get(userId)!;
}
