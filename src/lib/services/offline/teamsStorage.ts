/**
 * Teams-specific IndexedDB storage
 * Shared storage for team data used by both captains and players
 * Handles team roster, verification status, and team management
 */

export interface TeamDocument {
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

export interface TeamRecord extends TeamDocument {
  data: {
    id: string;
    name: string;
    description?: string;
    eventId?: string;
    sportId: string;
    sport?: { name: string };
    captainId: string;
    captainName: string;
    genderCategory: string;
    status: 'draft' | 'submitted' | 'verified' | 'rejected';
    panchayat: string;
    taluk: string;
    district: string;
    state: string;
    currentPlayers: number;
    maxPlayers: number;
    venueId?: string;
    teamPlayers: TeamPlayerRecord[];
  };
}

export interface TeamPlayerRecord {
  id: string;
  teamId: string;
  userId: string;
  position: 'captain' | 'player';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  panchayat: string;
  taluk: string;
  district: string;
  addedBy: string;
}

const TEAMS_DB_CONFIG = {
  name: 'TeamsOfflineDB',
  version: 1,
  stores: [
    {
      name: 'teams',
      keyPath: 'id',
      indexes: [
        { name: 'captainId', keyPath: 'data.captainId' },
        { name: 'status', keyPath: 'data.status' },
        { name: 'sportId', keyPath: 'data.sportId' },
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'teamPlayers',
      keyPath: 'id',
      indexes: [
        { name: 'teamId', keyPath: 'data.teamId' },
        { name: 'userId', keyPath: 'data.userId' },
        { name: 'verificationStatus', keyPath: 'data.verificationStatus' },
        { name: 'position', keyPath: 'data.position' }
      ]
    },
    {
      name: 'syncQueue',
      keyPath: 'id',
      indexes: [
        { name: 'priority', keyPath: 'priority' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    }
  ]
};

class TeamsStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(TEAMS_DB_CONFIG.name, TEAMS_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        TEAMS_DB_CONFIG.stores.forEach(storeConfig => {
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

  async putTeam(team: TeamRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['teams'], 'readwrite');
      const store = transaction.objectStore('teams');
      const request = store.put(team);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTeam(teamId: string): Promise<TeamRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['teams'], 'readonly');
      const store = transaction.objectStore('teams');
      const request = store.get(teamId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getTeamsByCaptain(captainId: string): Promise<TeamRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['teams'], 'readonly');
      const store = transaction.objectStore('teams');
      const index = store.index('captainId');
      const request = index.getAll(captainId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getTeamsByPlayer(userId: string): Promise<TeamRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['teams', 'teamPlayers'], 'readonly');
      const playerStore = transaction.objectStore('teamPlayers');
      const playerIndex = playerStore.index('userId');
      const playerRequest = playerIndex.getAll(userId);

      playerRequest.onsuccess = () => {
        const playerRecords = playerRequest.result || [];
        const teamIds = playerRecords.map(p => p.data.teamId);
        
        if (teamIds.length === 0) {
          resolve([]);
          return;
        }

        const teamStore = transaction.objectStore('teams');
        const teams: TeamRecord[] = [];
        let completed = 0;

        teamIds.forEach(teamId => {
          const teamRequest = teamStore.get(teamId);
          teamRequest.onsuccess = () => {
            if (teamRequest.result) {
              teams.push(teamRequest.result);
            }
            completed++;
            if (completed === teamIds.length) {
              resolve(teams);
            }
          };
        });
      };

      playerRequest.onerror = () => reject(playerRequest.error);
    });
  }
}

// Global storage instance
let teamsStorageInstance: TeamsStorageManager | null = null;

export async function getTeamsStorage(): Promise<TeamsStorageManager> {
  if (!teamsStorageInstance) {
    teamsStorageInstance = new TeamsStorageManager();
    await teamsStorageInstance.init();
  }
  
  return teamsStorageInstance;
}
