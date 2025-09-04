/**
 * Player-specific offline service
 * Handles player team membership, match schedules, and notifications
 */

import { getPlayerStorage, PlayerDocument, PlayerTeamRecord, PlayerMatchRecord, SyncQueueAction } from './playerStorage';

export interface PlayerTeamData {
  id: string;
  name: string;
  sport: string;
  status: 'draft' | 'submitted' | 'verified' | 'rejected';
  captainId: string;
  captainName: string;
  currentPlayers: number;
  venueId?: string;
  myPosition: 'captain' | 'player';
  myVerificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface PlayerMatchData {
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
  isMyTeam: boolean;
}

export interface PlayerNotificationData {
  id: string;
  title: string;
  message: string;
  type: 'team' | 'match' | 'verification' | 'system';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export class PlayerOfflineService {
  private storage: any;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storage = null;
  }

  private async getStorage() {
    if (!this.storage) {
      this.storage = await getPlayerStorage(this.userId);
    }
    return this.storage;
  }

  // Team Data
  async getMyTeams(): Promise<PlayerTeamData[]> {
    try {
      const storage = await this.getStorage();
      const teams = await storage.getAll('teams');
      return teams
        .filter((team: any) => 
          team.data.players?.some((p: any) => p.userId === this.userId)
        )
        .map((team: any) => {
          const myPlayer = team.data.players.find((p: any) => p.userId === this.userId);
          return {
            ...team.data,
            myPosition: myPlayer?.position || 'player',
            myVerificationStatus: myPlayer?.verificationStatus || 'pending'
          };
        });
    } catch (error) {
      console.error('Error getting player teams:', error);
      return [];
    }
  }

  async getMyPrimaryTeam(): Promise<PlayerTeamData | null> {
    const teams = await this.getMyTeams();
    return teams[0] || null; // Players typically belong to one team
  }

  // Match Data
  async getMyUpcomingMatches(limit: number = 10): Promise<PlayerMatchData[]> {
    try {
      const storage = await this.getStorage();
      const teams = await this.getMyTeams();
      const teamIds = teams.map(team => team.id);
      
      if (teamIds.length === 0) return [];
      
      const matches = await storage.getAll('matches');
      return matches
        .filter((match: any) => 
          (teamIds.includes(match.data.team1Id) || teamIds.includes(match.data.team2Id)) &&
          match.data.status !== 'completed'
        )
        .sort((a: any, b: any) => new Date(a.data.scheduledTime).getTime() - new Date(b.data.scheduledTime).getTime())
        .slice(0, limit)
        .map((match: any) => ({
          ...match.data,
          isMyTeam: teamIds.includes(match.data.team1Id) || teamIds.includes(match.data.team2Id)
        }));
    } catch (error) {
      console.error('Error getting player matches:', error);
      return [];
    }
  }

  // Notifications
  async getMyNotifications(): Promise<PlayerNotificationData[]> {
    try {
      const storage = await this.getStorage();
      const notifications = await storage.getAll('notifications');
      return notifications
        .filter((notification: any) => notification.userId === this.userId)
        .sort((a: any, b: any) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
        .map((notification: any) => notification.data);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const storage = await this.getStorage();
      const notification = await storage.get('notifications', notificationId);
      
      if (notification) {
        notification.data.read = true;
        notification.lastModified = Date.now();
        notification.synced = false;
        
        await storage.put('notifications', notification);
        await this.queueSync('notification_read', { id: notificationId });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Profile Management
  async updateProfile(profileData: any): Promise<void> {
    try {
      const storage = await this.getStorage();
      
      const profileDoc: PlayerDocument = {
        id: `profile_${this.userId}`,
        data: profileData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        userId: this.userId,
        version: 1,
        synced: false,
        priority: 'medium',
        size: JSON.stringify(profileData).length
      };
      
      await storage.put('profile', profileDoc);
      await this.queueSync('profile_update', profileDoc);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
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
        priority: 'medium'
      };
      
      await storage.put('syncQueue', syncAction);
    } catch (error) {
      console.error('Error queuing sync action:', error);
    }
  }

  // Data Preloading
  async preloadPlayerData(): Promise<void> {
    try {
      await Promise.all([
        this.getMyTeams(),
        this.getMyUpcomingMatches(5),
        this.getMyNotifications()
      ]);
    } catch (error) {
      console.error('Error preloading player data:', error);
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
