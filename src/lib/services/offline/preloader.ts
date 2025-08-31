/**
 * Data preloading system for volunteers
 * Intelligently caches essential data on login for optimal offline experience
 * Manages 50MB storage limit with priority-based loading
 */

import { getVolunteerStorage, VolunteerDocument, VolunteerAssignment, TeamRecord, PlayerRecord, MatchRecord, VenueConfiguration } from './volunteerStorage';

export interface PreloadConfig {
  userId: string;
  forceRefresh?: boolean;
  priorityLevel?: 'critical' | 'full' | 'minimal';
  maxStorageSize?: number; // in bytes
  venueId?: string; // If known, optimize for specific venue
}

export interface PreloadProgress {
  phase: 'starting' | 'assignments' | 'venue_config' | 'teams' | 'players' | 'matches' | 'cleanup' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  details?: {
    loaded: number;
    total: number;
    currentItem?: string;
  };
}

export interface PreloadResult {
  success: boolean;
  error?: string;
  stats: {
    totalSize: number;
    documentsLoaded: number;
    cacheHits: number;
    loadTimeMs: number;
    storageUsage: {
      teams: number;
      players: number;
      matches: number;
      assignments: number;
      configs: number;
    };
  };
  warnings: string[];
}

export class VolunteerDataPreloader {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private progressCallback?: (progress: PreloadProgress) => void;

  constructor(progressCallback?: (progress: PreloadProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Main preload method - loads all essential volunteer data
   */
  async preloadVolunteerData(config: PreloadConfig): Promise<PreloadResult> {
    const startTime = Date.now();
    const result: PreloadResult = {
      success: false,
      stats: {
        totalSize: 0,
        documentsLoaded: 0,
        cacheHits: 0,
        loadTimeMs: 0,
        storageUsage: {
          teams: 0,
          players: 0,
          matches: 0,
          assignments: 0,
          configs: 0,
        },
      },
      warnings: [],
    };

    try {
      // Initialize storage
      this.storage = await getVolunteerStorage();
      this.updateProgress('starting', 0, 'Initializing volunteer data preload...');

      // Phase 1: Load volunteer assignments (Critical)
      this.updateProgress('assignments', 10, 'Loading volunteer assignments...');
      const assignments = await this.preloadAssignments(config);
      result.stats.documentsLoaded += assignments.length;
      result.stats.storageUsage.assignments = assignments.reduce((sum, a) => sum + a.size, 0);

      if (assignments.length === 0) {
        result.warnings.push('No volunteer assignments found - limited offline functionality');
      }

      // Determine primary venue ID
      const primaryVenueId = config.venueId || this.determinePrimaryVenue(assignments);
      if (!primaryVenueId) {
        throw new Error('No venue assignment found for volunteer');
      }

      // Phase 2: Load venue configuration (Critical)
      this.updateProgress('venue_config', 20, `Loading venue configuration for ${primaryVenueId}...`);
      const venueConfig = await this.preloadVenueConfig(primaryVenueId);
      if (venueConfig) {
        result.stats.documentsLoaded += 1;
        result.stats.storageUsage.configs += venueConfig.size;
      }

      // Phase 3: Load teams for assigned venue (Critical)
      this.updateProgress('teams', 30, 'Loading team rosters...');
      const teams = await this.preloadTeams(primaryVenueId, config);
      result.stats.documentsLoaded += teams.length;
      result.stats.storageUsage.teams = teams.reduce((sum, t) => sum + t.size, 0);

      // Phase 4: Load players for teams (High Priority)
      this.updateProgress('players', 50, 'Loading player data...');
      const players = await this.preloadPlayers(teams.map(t => t.data.id), config);
      result.stats.documentsLoaded += players.length;
      result.stats.storageUsage.players = players.reduce((sum, p) => sum + p.size, 0);

      // Phase 5: Load match fixtures (High Priority)
      this.updateProgress('matches', 70, 'Loading match fixtures...');
      const matches = await this.preloadMatches(primaryVenueId, config);
      result.stats.documentsLoaded += matches.length;
      result.stats.storageUsage.matches = matches.reduce((sum, m) => sum + m.size, 0);

      // Phase 6: Storage cleanup if needed
      this.updateProgress('cleanup', 85, 'Optimizing storage...');
      await this.optimizeStorage(config.maxStorageSize || 50 * 1024 * 1024); // 50MB default

      // Calculate final stats
      result.stats.totalSize = Object.values(result.stats.storageUsage).reduce((sum, size) => sum + size, 0);
      result.stats.loadTimeMs = Date.now() - startTime;

      // Phase 7: Complete
      this.updateProgress('completed', 100, `Preload completed: ${result.stats.documentsLoaded} items loaded`);
      
      result.success = true;

      // Log preload summary
      console.log('📱 Volunteer data preload completed:', {
        documentsLoaded: result.stats.documentsLoaded,
        totalSize: Math.round(result.stats.totalSize / 1024 / 1024) + 'MB',
        loadTime: result.stats.loadTimeMs + 'ms',
        venueId: primaryVenueId,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown preload error';
      result.error = errorMessage;
      result.stats.loadTimeMs = Date.now() - startTime;
      
      this.updateProgress('error', 0, `Preload failed: ${errorMessage}`);
      console.error('❌ Volunteer data preload failed:', error);
    }

    return result;
  }

  /**
   * Load volunteer assignments
   */
  private async preloadAssignments(config: PreloadConfig): Promise<VolunteerAssignment[]> {
    try {
      // Try cache first if not forcing refresh
      if (!config.forceRefresh) {
        const cached = await this.cacheService.getUserSession(config.userId);
        if (cached?.assignments) {
          return this.storeDocuments('volunteerAssignments', cached.assignments, 'high');
        }
      }

      // Fetch from API using tRPC
      // Note: In a real implementation, this would use the actual tRPC client
      // For now, we'll simulate the API call
      const assignmentsData = await this.fetchVolunteerAssignments(config.userId);
      
      // Store in IndexedDB
      const assignments = await this.storeDocuments('volunteerAssignments', assignmentsData, 'high');
      
      // Cache for quick access
      await this.cacheService.cacheUserSession(config.userId, { assignments: assignmentsData });

      return assignments;
    } catch (error) {
      console.error('Failed to preload assignments:', error);
      return [];
    }
  }

  /**
   * Load venue configuration
   */
  private async preloadVenueConfig(venueId: string): Promise<VenueConfiguration | null> {
    try {
      // Try Redis cache first
      const cached = await this.cacheService.get(`config:venue:${venueId}`);
      if (cached) {
        const stored = await this.storeDocuments('venueConfigs', [cached], 'medium');
        return stored[0] || null;
      }

      // Fetch from API
      const configData = await this.fetchVenueConfig(venueId);
      if (!configData) return null;

      // Store in IndexedDB and cache
      const stored = await this.storeDocuments('venueConfigs', [configData], 'medium');
      await this.cacheService.setWithPriority(`config:venue:${venueId}`, configData, 24 * 60 * 60, 'low'); // 24h TTL

      return stored[0] || null;
    } catch (error) {
      console.error('Failed to preload venue config:', error);
      return null;
    }
  }

  /**
   * Load teams for venue
   */
  private async preloadTeams(venueId: string, config: PreloadConfig): Promise<TeamRecord[]> {
    try {
      // Try Redis cache first
      const cached = await this.cacheService.getTeamSummaries(venueId);
      if (cached && !config.forceRefresh) {
        return this.storeDocuments('teams', cached, 'high');
      }

      // Fetch from API
      const teamsData = await this.fetchTeamsForVenue(venueId);
      
      // Filter based on priority level
      const filteredTeams = this.filterTeamsByPriority(teamsData, config.priorityLevel || 'full');
      
      // Store in IndexedDB
      const teams = await this.storeDocuments('teams', filteredTeams, 'high');
      
      // Cache team summaries
      await this.cacheService.cacheTeamSummaries(venueId, filteredTeams);

      this.updateProgress('teams', 40, `Loaded ${teams.length} teams`);
      return teams;
    } catch (error) {
      console.error('Failed to preload teams:', error);
      return [];
    }
  }

  /**
   * Load players for teams
   */
  private async preloadPlayers(teamIds: string[], config: PreloadConfig): Promise<PlayerRecord[]> {
    const allPlayers: PlayerRecord[] = [];
    
    try {
      let loadedTeams = 0;
      
      for (const teamId of teamIds) {
        this.updateProgress('players', 50 + (loadedTeams / teamIds.length) * 15, 
          `Loading players for team ${loadedTeams + 1}/${teamIds.length}...`);

        try {
          // Fetch players for this team
          const playersData = await this.fetchPlayersForTeam(teamId);
          
          // Filter based on priority (verified players first in critical mode)
          const filteredPlayers = this.filterPlayersByPriority(playersData, config.priorityLevel || 'full');
          
          // Store players
          const players = await this.storeDocuments('players', filteredPlayers, 'medium');
          allPlayers.push(...players);
          
        } catch (error) {
          console.warn(`Failed to load players for team ${teamId}:`, error);
        }
        
        loadedTeams++;
      }

      this.updateProgress('players', 65, `Loaded ${allPlayers.length} players`);
      return allPlayers;
    } catch (error) {
      console.error('Failed to preload players:', error);
      return allPlayers;
    }
  }

  /**
   * Load match fixtures
   */
  private async preloadMatches(venueId: string, config: PreloadConfig): Promise<MatchRecord[]> {
    try {
      // Get today's date for fixtures
      const today = new Date().toISOString().split('T')[0];
      
      // Try Redis cache first
      const cached = await this.cacheService.getFixtures(venueId, today);
      if (cached && !config.forceRefresh) {
        return this.storeDocuments('matches', cached, 'high');
      }

      // Fetch match fixtures
      const matchData = await this.fetchMatchFixtures(venueId, config);
      
      // Store in IndexedDB
      const matches = await this.storeDocuments('matches', matchData, 'high');
      
      // Cache fixtures
      await this.cacheService.cacheFixtures(venueId, today, matchData);

      this.updateProgress('matches', 80, `Loaded ${matches.length} matches`);
      return matches;
    } catch (error) {
      console.error('Failed to preload matches:', error);
      return [];
    }
  }

  /**
   * Store documents in IndexedDB with metadata
   */
  private async storeDocuments<T extends VolunteerDocument>(
    storeName: string, 
    data: any[], 
    priority: 'high' | 'medium' | 'low'
  ): Promise<T[]> {
    const documents: T[] = [];
    
    for (const item of data) {
      const document: T = {
        id: item.id || `${storeName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: item,
        timestamp: Date.now(),
        lastModified: Date.now(),
        userId: item.userId || item.volunteerId,
        venueId: item.venueId,
        version: 1,
        synced: true, // Freshly loaded data is considered synced
        priority,
        size: new Blob([JSON.stringify(item)]).size,
      } as T;

      await this.storage!.store(storeName, document, { priority });
      documents.push(document);
    }

    return documents;
  }

  /**
   * Optimize storage by removing old/low-priority data
   */
  private async optimizeStorage(maxSize: number): Promise<void> {
    if (!this.storage) return;

    const usage = await this.storage.getStorageUsage();
    
    if (usage.total <= maxSize) {
      return; // Within limits
    }

    // Clean up low priority items first
    await this.storage.cleanup(maxSize);
  }

  /**
   * Update progress callback
   */
  private updateProgress(phase: PreloadProgress['phase'], progress: number, message: string, details?: any): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, progress, message, details });
    }
  }

  /**
   * Determine primary venue from assignments
   */
  private determinePrimaryVenue(assignments: VolunteerAssignment[]): string | null {
    if (assignments.length === 0) return null;
    
    // Return the most recent active assignment's venue
    const activeAssignments = assignments.filter(a => a.data.status === 'active');
    if (activeAssignments.length > 0) {
      return activeAssignments[0].data.venueId;
    }
    
    // Fallback to first assignment
    return assignments[0].data.venueId;
  }

  /**
   * Filter teams based on priority level
   */
  private filterTeamsByPriority(teams: any[], priority: string): any[] {
    switch (priority) {
      case 'critical':
        // Only checked-in teams
        return teams.filter(team => team.status === 'checked_in');
      case 'minimal':
        // Only active teams (checked in + competing)
        return teams.filter(team => ['checked_in', 'competing'].includes(team.status));
      default:
        // All teams
        return teams;
    }
  }

  /**
   * Filter players based on priority level
   */
  private filterPlayersByPriority(players: any[], priority: string): any[] {
    switch (priority) {
      case 'critical':
        // Only verified players
        return players.filter(player => player.verificationStatus === 'verified');
      case 'minimal':
        // Verified + pending players
        return players.filter(player => ['verified', 'pending'].includes(player.verificationStatus));
      default:
        // All players
        return players;
    }
  }

  // Mock API calls - In real implementation, these would use tRPC
  private async fetchVolunteerAssignments(userId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async fetchVenueConfig(venueId: string): Promise<any> {
    // Mock implementation
    return null;
  }

  private async fetchTeamsForVenue(venueId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async fetchPlayersForTeam(teamId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async fetchMatchFixtures(venueId: string, config: PreloadConfig): Promise<any[]> {
    // Mock implementation
    return [];
  }
}

/**
 * Convenience function to preload data for a volunteer
 */
export const preloadVolunteerData = async (
  config: PreloadConfig,
  progressCallback?: (progress: PreloadProgress) => void
): Promise<PreloadResult> => {
  const preloader = new VolunteerDataPreloader(progressCallback);
  return await preloader.preloadVolunteerData(config);
};

/**
 * Check if volunteer data needs refresh
 */
export const shouldRefreshVolunteerData = async (userId: string): Promise<boolean> => {
  try {
    const storage = await getVolunteerStorage();
    const assignments = await storage.query<VolunteerAssignment>('volunteerAssignments', {
      filter: (doc) => doc.userId === userId && !doc.deleted
    });

    if (assignments.length === 0) return true;

    // Check if data is older than 6 hours
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    return assignments.some(assignment => assignment.lastModified < sixHoursAgo);
  } catch (error) {
    console.error('Error checking data freshness:', error);
    return true; // Err on the side of refreshing
  }
};

export default VolunteerDataPreloader;