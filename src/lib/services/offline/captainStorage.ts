/**
 * Captain-specific IndexedDB storage system
 * Follows volunteer storage patterns for consistency
 * Optimized for team management workflow
 */

export interface CaptainDocument {
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

export interface CaptainTeamRecord extends CaptainDocument {
  data: {
    teamId: string;
    name: string;
    sport: string;
    status: 'draft' | 'submitted' | 'verified' | 'rejected';
    currentPlayers: number;
    maxPlayers: number;
    captainId: string;
    venueId?: string;
    eventId?: string;
    sportId: string;
    genderCategory: string;
    panchayat: string;
    taluk: string;
    district: string;
    state: string;
  };
}

export interface CaptainPlayerRecord extends CaptainDocument {
  data: {
    id: string;
    teamId: string;
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
    position: 'captain' | 'player';
    verificationStatus: 'pending' | 'verified' | 'rejected';
    dateOfBirth: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    panchayat: string;
    taluk: string;
    district: string;
  };
}

export interface CaptainMatchRecord extends CaptainDocument {
  data: {
    id: string;
    team1Id: string;
    team2Id: string;
    team1Score?: number;
    team2Score?: number;
    scheduledTime: string;
    status: 'scheduled' | 'live' | 'completed' | 'cancelled';
    venueId: string;
    round?: string;
    level?: string;
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

const CAPTAIN_DB_CONFIG = {
  name: 'CaptainOfflineDB',
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
      name: 'players',
      keyPath: 'id',
      indexes: [
        { name: 'teamId', keyPath: 'data.teamId' },
        { name: 'userId', keyPath: 'data.userId' },
        { name: 'verificationStatus', keyPath: 'data.verificationStatus' }
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
        { name: 'timestamp', keyPath: 'timestamp' }
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

class CaptainStorageManager {
  private db: IDBDatabase | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${CAPTAIN_DB_CONFIG.name}_${this.userId}`, CAPTAIN_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        CAPTAIN_DB_CONFIG.stores.forEach(storeConfig => {
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
const captainStorageInstances = new Map<string, CaptainStorageManager>();

export async function getCaptainStorage(userId: string): Promise<CaptainStorageManager> {
  if (!captainStorageInstances.has(userId)) {
    const storage = new CaptainStorageManager(userId);
    await storage.init();
    captainStorageInstances.set(userId, storage);
  }
  
  return captainStorageInstances.get(userId)!;
}
