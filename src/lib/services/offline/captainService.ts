/**
 * Captain-specific offline service
 * Extends volunteer offline patterns for captain team management
 * Handles team roster, match data, and venue information
 */

import { getCaptainStorage, CaptainDocument, CaptainTeamRecord, CaptainPlayerRecord, CaptainMatchRecord, SyncQueueAction } from './captainStorage';

export interface CaptainTeamData {
  teamId: string;
  name: string;
  sport: string;
  status: 'draft' | 'submitted' | 'verified' | 'rejected';
  currentPlayers: number;
  maxPlayers: number;
  captainId: string;
  venueId?: string;
}

export interface CaptainPlayerData {
  id: string;
  teamId: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: 'captain' | 'player';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O';
}

export interface CaptainMatchData {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  scheduledTime: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  venueId: string;
}

export class CaptainOfflineService {
  private storage: any;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storage = null;
  }

  private async getStorage() {
    if (!this.storage) {
      this.storage = await getCaptainStorage(this.userId);
    }
    return this.storage;
  }

  // Team Management
  async getMyTeam(): Promise<CaptainTeamData | null> {
    try {
      const storage = await this.getStorage();
      const teams = await storage.getAll('teams');
      const myTeam = teams.find((team: any) => team.data.captainId === this.userId);
      return myTeam?.data || null;
    } catch (error) {
      console.error('Error getting team:', error);
      return null;
    }
  }

  async updateTeam(teamData: Partial<CaptainTeamData>): Promise<void> {
    try {
      const storage = await this.getStorage();
      const existingTeam = await this.getMyTeam();
      
      if (existingTeam) {
        const updatedTeam: CaptainDocument = {
          id: existingTeam.teamId,
          data: { ...existingTeam, ...teamData },
          timestamp: Date.now(),
          lastModified: Date.now(),
          userId: this.userId,
          version: 1,
          synced: false,
          priority: 'high',
          size: JSON.stringify(teamData).length
        };
        
        await storage.put('teams', updatedTeam);
        await this.queueSync('team_update', updatedTeam);
      }
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  // Player Management
  async getTeamPlayers(): Promise<CaptainPlayerData[]> {
    try {
      const storage = await this.getStorage();
      const team = await this.getMyTeam();
      
      if (!team) return [];
      
      const players = await storage.getAll('players');
      return players
        .filter((player: any) => player.data.teamId === team.teamId)
        .map((player: any) => player.data);
    } catch (error) {
      console.error('Error getting team players:', error);
      return [];
    }
  }

  async addPlayer(playerData: CaptainPlayerData): Promise<void> {
    try {
      const storage = await this.getStorage();
      
      const playerDoc: CaptainDocument = {
        id: playerData.id,
        data: playerData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        userId: this.userId,
        version: 1,
        synced: false,
        priority: 'high',
        size: JSON.stringify(playerData).length
      };
      
      await storage.put('players', playerDoc);
      await this.queueSync('player_add', playerDoc);
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    try {
      const storage = await this.getStorage();
      await storage.delete('players', playerId);
      await this.queueSync('player_remove', { id: playerId });
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  // Match Data
  async getUpcomingMatches(limit: number = 10): Promise<CaptainMatchData[]> {
    try {
      const storage = await this.getStorage();
      const team = await this.getMyTeam();
      
      if (!team) return [];
      
      const matches = await storage.getAll('matches');
      return matches
        .filter((match: any) => 
          (match.data.team1Id === team.teamId || match.data.team2Id === team.teamId) &&
          match.data.status !== 'completed'
        )
        .sort((a: any, b: any) => new Date(a.data.scheduledTime).getTime() - new Date(b.data.scheduledTime).getTime())
        .slice(0, limit)
        .map((match: any) => match.data);
    } catch (error) {
      console.error('Error getting upcoming matches:', error);
      return [];
    }
  }

  // Sync Queue Management
  private async queueSync(action: string, data: any): Promise<void> {
    try {
      const storage = await this.getStorage();
      const syncAction: SyncQueueAction = {
        id: `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        data,
        timestamp: Date.now(),
        userId: this.userId,
        retryCount: 0,
        priority: 'high'
      };
      
      await storage.put('syncQueue', syncAction);
    } catch (error) {
      console.error('Error queuing sync action:', error);
    }
  }

  // Data Preloading
  async preloadCaptainData(): Promise<void> {
    try {
      // Load essential captain data for offline use
      await Promise.all([
        this.getMyTeam(),
        this.getTeamPlayers(),
        this.getUpcomingMatches(5)
      ]);
    } catch (error) {
      console.error('Error preloading captain data:', error);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    try {
      const storage = await this.getStorage();
      await storage.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
