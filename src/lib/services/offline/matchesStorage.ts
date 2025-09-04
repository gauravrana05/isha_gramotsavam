/**
 * Matches-specific IndexedDB storage
 * Handles match and fixture data, live scores, tournament brackets
 * Venue-specific match filtering for mobile optimization
 */

export interface MatchDocument {
  id: string;
  data: any;
  timestamp: number;
  lastModified: number;
  venueId?: string;
  version: number;
  synced: boolean;
  deleted?: boolean;
  priority: 'high' | 'medium' | 'low';
  size: number;
}

export interface MatchRecord extends MatchDocument {
  data: {
    id: string;
    team1Id: string;
    team2Id: string;
    team1?: { id: string; name: string };
    team2?: { id: string; name: string };
    team1Score?: number;
    team2Score?: number;
    scheduledTime: string;
    actualStartTime?: string;
    completedAt?: string;
    status: 'scheduled' | 'live' | 'completed' | 'cancelled';
    venueId: string;
    venue?: { id: string; name: string };
    round?: string;
    level?: 'cluster' | 'division' | 'final';
    eventId?: string;
    sportId?: string;
  };
}

export interface FixtureRecord extends MatchDocument {
  data: {
    id: string;
    eventId: string;
    sportId: string;
    level: 'cluster' | 'division' | 'final';
    venueId: string;
    matches: MatchRecord[];
    bracket?: any;
    status: 'upcoming' | 'ongoing' | 'completed';
  };
}

const MATCHES_DB_CONFIG = {
  name: 'MatchesOfflineDB',
  version: 1,
  stores: [
    {
      name: 'matches',
      keyPath: 'id',
      indexes: [
        { name: 'team1Id', keyPath: 'data.team1Id' },
        { name: 'team2Id', keyPath: 'data.team2Id' },
        { name: 'status', keyPath: 'data.status' },
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'scheduledTime', keyPath: 'data.scheduledTime' },
        { name: 'level', keyPath: 'data.level' }
      ]
    },
    {
      name: 'fixtures',
      keyPath: 'id',
      indexes: [
        { name: 'eventId', keyPath: 'data.eventId' },
        { name: 'sportId', keyPath: 'data.sportId' },
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'level', keyPath: 'data.level' },
        { name: 'status', keyPath: 'data.status' }
      ]
    },
    {
      name: 'liveScores',
      keyPath: 'id',
      indexes: [
        { name: 'matchId', keyPath: 'data.matchId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    }
  ]
};

class MatchesStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MATCHES_DB_CONFIG.name, MATCHES_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        MATCHES_DB_CONFIG.stores.forEach(storeConfig => {
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

  async putMatch(match: MatchRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readwrite');
      const store = transaction.objectStore('matches');
      const request = store.put(match);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMatch(matchId: string): Promise<MatchRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readonly');
      const store = transaction.objectStore('matches');
      const request = store.get(matchId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getLiveMatches(): Promise<MatchRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readonly');
      const store = transaction.objectStore('matches');
      const index = store.index('status');
      const request = index.getAll('live');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getUpcomingMatches(limit?: number): Promise<MatchRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readonly');
      const store = transaction.objectStore('matches');
      const index = store.index('scheduledTime');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const matches = (request.result || [])
          .filter((match: MatchRecord) => 
            match.data.status === 'scheduled' && 
            new Date(match.data.scheduledTime) > new Date()
          )
          .sort((a: MatchRecord, b: MatchRecord) => 
            new Date(a.data.scheduledTime).getTime() - new Date(b.data.scheduledTime).getTime()
          );
        
        resolve(limit ? matches.slice(0, limit) : matches);
      };
    });
  }

  async getMatchesByTeam(teamId: string): Promise<MatchRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readonly');
      const store = transaction.objectStore('matches');
      
      const team1Request = store.index('team1Id').getAll(teamId);
      const team2Request = store.index('team2Id').getAll(teamId);
      
      let team1Matches: MatchRecord[] = [];
      let team2Matches: MatchRecord[] = [];
      let completed = 0;

      team1Request.onsuccess = () => {
        team1Matches = team1Request.result || [];
        completed++;
        if (completed === 2) {
          const allMatches = [...team1Matches, ...team2Matches];
          const uniqueMatches = allMatches.filter((match, index, self) => 
            index === self.findIndex(m => m.id === match.id)
          );
          resolve(uniqueMatches);
        }
      };

      team2Request.onsuccess = () => {
        team2Matches = team2Request.result || [];
        completed++;
        if (completed === 2) {
          const allMatches = [...team1Matches, ...team2Matches];
          const uniqueMatches = allMatches.filter((match, index, self) => 
            index === self.findIndex(m => m.id === match.id)
          );
          resolve(uniqueMatches);
        }
      };

      team1Request.onerror = () => reject(team1Request.error);
      team2Request.onerror = () => reject(team2Request.error);
    });
  }

  async getMatchesByVenue(venueId: string): Promise<MatchRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['matches'], 'readonly');
      const store = transaction.objectStore('matches');
      const index = store.index('venueId');
      const request = index.getAll(venueId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async updateMatchScore(matchId: string, team1Score: number, team2Score: number): Promise<void> {
    const match = await this.getMatch(matchId);
    if (match) {
      match.data.team1Score = team1Score;
      match.data.team2Score = team2Score;
      match.lastModified = Date.now();
      match.synced = false;
      await this.putMatch(match);
    }
  }
}

// Global storage instance
let matchesStorageInstance: MatchesStorageManager | null = null;

export async function getMatchesStorage(): Promise<MatchesStorageManager> {
  if (!matchesStorageInstance) {
    matchesStorageInstance = new MatchesStorageManager();
    await matchesStorageInstance.init();
  }
  
  return matchesStorageInstance;
}
