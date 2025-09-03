/**
 * High-level volunteer storage service
 * Provides clean API for common volunteer operations with offline-first approach
 * Handles sync queue management and intelligent caching
 */

import { getVolunteerStorage, VolunteerDocument, TeamRecord, PlayerRecord, MatchRecord, SyncQueueAction, MediaQueueItem } from './volunteerStorage';
import { preloadVolunteerData, PreloadConfig, PreloadProgress } from './preloader';

export interface TeamCheckInData {
  teamId: string;
  checkedInBy: string;
  timestamp: number;
  notes?: string;
}

export interface PlayerVerificationData {
  playerId: string;
  status: 'verified' | 'rejected';
  verifiedBy: string;
  timestamp: number;
  notes?: string;
  documents?: {
    aadhaar?: string;
    photo?: string;
    other?: string[];
  };
}

export interface MatchScoreData {
  matchId: string;
  teamScores: { teamId: string; score: number }[];
  updatedBy: string;
  timestamp: number;
}

export interface MatchEventData {
  matchId: string;
  type: 'goal' | 'foul' | 'yellow_card' | 'red_card' | 'substitution' | 'timeout' | 'other';
  teamId?: string;
  playerId?: string;
  description: string;
  timestamp: number;
  metadata?: any;
}

export interface MediaUploadData {
  file: File | Blob;
  entityId: string;
  entityType: 'team' | 'player' | 'match' | 'venue';
  description?: string;
  metadata?: any;
}

export class VolunteerService {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private initialized = false;
  private initializing = false;

  /**
   * Initialize the service
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for existing initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.initializing = true;
    try {
      this.storage = await getVolunteerStorage();
      this.initialized = true;
      console.log('✅ Volunteer service initialized');
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(userId?: string): Promise<void> {
    if (!this.initialized) {
      if (!userId) throw new Error('User ID required for initialization');
      await this.initialize(userId);
    }
  }

  // ====================
  // DATA PRELOADING
  // ====================

  /**
   * Preload volunteer data for offline use
   */
  async preloadData(
    config: PreloadConfig,
    progressCallback?: (progress: PreloadProgress) => void
  ): Promise<void> {
    await this.ensureInitialized(config.userId);
    
    const result = await preloadVolunteerData(config, progressCallback);
    
    if (!result.success) {
      throw new Error(`Data preload failed: ${result.error}`);
    }

    console.log('📱 Volunteer data preload completed:', result.stats);
  }

  // ====================
  // TEAM OPERATIONS
  // ====================

  /**
   * Get all teams for a venue
   */
  async getTeamsForVenue(venueId: string, userId: string): Promise<TeamRecord[]> {
    await this.ensureInitialized(userId);

    const teams = await this.storage!.query<TeamRecord>('teams', {
      index: 'venueId',
      key: venueId,
      filter: (team) => !team.deleted,
      orderBy: 'asc',
    });

    return teams;
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string, userId: string): Promise<TeamRecord | null> {
    await this.ensureInitialized(userId);
    return await this.storage!.get<TeamRecord>('teams', teamId);
  }

  /**
   * Search teams by name or sport
   */
  async searchTeams(venueId: string, query: string, userId: string): Promise<TeamRecord[]> {
    await this.ensureInitialized(userId);

    // Try localStorage cache first
    const cacheKey = `team_search_${venueId}_${query}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedTeams = JSON.parse(cached);
        return cachedTeams.map((team: any) => ({
          id: team.id,
          data: team,
          timestamp: Date.now(),
          lastModified: Date.now(),
          venueId,
          version: 1,
          synced: true,
          priority: 'medium' as const,
          size: JSON.stringify(team).length,
        }));
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // Search in IndexedDB
    const allTeams = await this.getTeamsForVenue(venueId, userId);
    const filtered = allTeams.filter(team => 
      team.data.name.toLowerCase().includes(query.toLowerCase()) ||
      team.data.sport.toLowerCase().includes(query.toLowerCase())
    );

    // Cache the results in localStorage
    localStorage.setItem(cacheKey, JSON.stringify(filtered.map(t => t.data)));

    return filtered;
  }

  /**
   * Check in a team
   */
  async checkInTeam(data: TeamCheckInData, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    // Get the team
    const team = await this.getTeam(data.teamId, userId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Update team status
    team.data.status = 'checked_in';
    team.data.checkedInAt = data.timestamp;
    team.data.lastActivity = data.timestamp;
    team.synced = false;
    team.lastModified = Date.now();

    // Store updated team
    await this.storage!.store('teams', team);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'team_checkin',
      action: 'update',
      entityId: data.teamId,
      entityType: 'team',
      payload: data,
      priority: 'critical',
      venueId: team.venueId,
      userId,
    });

    console.log(`✅ Team ${team.data.name} checked in offline`);
  }

  // ====================
  // PLAYER OPERATIONS
  // ====================

  /**
   * Get players for a team
   */
  async getPlayersForTeam(teamId: string, userId: string): Promise<PlayerRecord[]> {
    await this.ensureInitialized(userId);

    const players = await this.storage!.query<PlayerRecord>('players', {
      index: 'teamId',
      key: teamId,
      filter: (player) => !player.deleted,
      orderBy: 'asc',
    });

    return players;
  }

  /**
   * Verify a player
   */
  async verifyPlayer(data: PlayerVerificationData, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    // Get the player
    const player = await this.storage!.get<PlayerRecord>('players', data.playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Update verification status
    player.data.verificationStatus = data.status;
    player.data.verificationNotes = data.notes;
    player.data.verifiedBy = data.verifiedBy;
    player.data.verifiedAt = data.timestamp;
    player.data.lastUpdated = data.timestamp;
    player.synced = false;
    player.lastModified = Date.now();

    // Update documents if provided
    if (data.documents) {
      player.data.documents = { ...player.data.documents, ...data.documents };
    }

    // Store updated player
    await this.storage!.store('players', player);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'player_verification',
      action: 'update',
      entityId: data.playerId,
      entityType: 'player',
      payload: data,
      priority: 'critical',
      venueId: player.venueId,
      userId,
    });

    console.log(`✅ Player ${player.data.name} verification updated offline`);
  }

  // ====================
  // MATCH OPERATIONS
  // ====================

  /**
   * Get matches for a venue
   */
  async getMatchesForVenue(venueId: string, date?: string, userId?: string): Promise<MatchRecord[]> {
    await this.ensureInitialized(userId);

    let matches = await this.storage!.query<MatchRecord>('matches', {
      index: 'venueId',
      key: venueId,
      filter: (match) => !match.deleted,
      orderBy: 'asc',
    });

    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date).toDateString();
      matches = matches.filter(match => 
        new Date(match.data.scheduledTime).toDateString() === targetDate
      );
    }

    return matches;
  }

  /**
   * Update match score
   */
  async updateMatchScore(data: MatchScoreData, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    // Get the match
    const match = await this.storage!.get<MatchRecord>('matches', data.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Update scores
    data.teamScores.forEach(teamScore => {
      const team = match.data.teams.find(t => t.id === teamScore.teamId);
      if (team) {
        team.score = teamScore.score;
      }
    });

    // Update match metadata
    match.data.lastUpdated = data.timestamp;
    match.synced = false;
    match.lastModified = Date.now();

    // Store updated match
    await this.storage!.store('matches', match);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'match_score',
      action: 'update',
      entityId: data.matchId,
      entityType: 'match',
      payload: data,
      priority: 'critical',
      venueId: match.venueId,
      userId,
    });

    console.log(`✅ Match score updated offline for match ${data.matchId}`);
  }

  /**
   * Add match event
   */
  async addMatchEvent(data: MatchEventData, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    // Get the match
    const match = await this.storage!.get<MatchRecord>('matches', data.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Add event
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      timestamp: data.timestamp,
      teamId: data.teamId,
      playerId: data.playerId,
      description: data.description,
      metadata: data.metadata,
    };

    match.data.events.push(event);
    match.data.lastUpdated = data.timestamp;
    match.synced = false;
    match.lastModified = Date.now();

    // Store updated match
    await this.storage!.store('matches', match);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'match_event',
      action: 'create',
      entityId: data.matchId,
      entityType: 'match_event',
      payload: { ...data, eventId: event.id },
      priority: 'high',
      venueId: match.venueId,
      userId,
    });

    console.log(`✅ Match event added offline: ${data.type} for match ${data.matchId}`);
  }

  // ====================
  // MEDIA OPERATIONS
  // ====================

  /**
   * Queue media for upload
   */
  async queueMediaUpload(data: MediaUploadData, userId: string): Promise<string> {
    await this.ensureInitialized(userId);

    // Generate unique ID
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store file in binary data store
    const binaryData = {
      id: `binary_${mediaId}`,
      mediaId,
      data: await data.file.arrayBuffer(),
      size: data.file.size,
      createdAt: Date.now(),
    };

    // Store binary data
    await this.storage!.store('binaryData', binaryData);

    // Create media queue item
    const mediaItem: MediaQueueItem = {
      id: mediaId,
      data: {
        id: mediaId,
        type: data.file.type.startsWith('image/') ? 'photo' : 
              data.file.type.startsWith('video/') ? 'video' : 'document',
        fileName: (data.file as File).name || `media_${Date.now()}`,
        fileSize: data.file.size,
        mimeType: data.file.type,
        localPath: `binary_${mediaId}`,
        uploadPath: `/uploads/${data.entityType}/${data.entityId}/${mediaId}`,
        entityId: data.entityId,
        entityType: data.entityType,
        description: data.description,
        metadata: data.metadata,
        uploadProgress: 0,
        uploadStatus: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
      lastModified: Date.now(),
      userId,
      version: 1,
      synced: false,
      priority: 'medium',
      size: data.file.size,
    };

    // Store media item
    await this.storage!.store('mediaQueue', mediaItem);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'media_upload',
      action: 'create',
      entityId: mediaId,
      entityType: 'media',
      payload: {
        mediaId,
        entityId: data.entityId,
        entityType: data.entityType,
      },
      priority: 'low', // Media uploads are lower priority
      userId,
    });

    console.log(`✅ Media queued for upload: ${mediaItem.data.fileName} (${Math.round(data.file.size / 1024)}KB)`);

    return mediaId;
  }

  /**
   * Get pending media uploads
   */
  async getPendingMediaUploads(userId: string): Promise<MediaQueueItem[]> {
    await this.ensureInitialized(userId);

    return await this.storage!.query<MediaQueueItem>('mediaQueue', {
      index: 'uploadStatus',
      key: 'pending',
      filter: (item) => item.userId === userId,
    });
  }

  // ====================
  // SYNC OPERATIONS
  // ====================

  /**
   * Add action to sync queue
   */
  private async addToSyncQueue(actionData: {
    type: SyncQueueAction['data']['type'];
    action: SyncQueueAction['data']['action'];
    entityId: string;
    entityType: string;
    payload: any;
    priority: SyncQueueAction['data']['priority'];
    venueId?: string;
    userId: string;
    dependencies?: string[];
  }): Promise<void> {
    const actionId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const syncAction: SyncQueueAction = {
      id: actionId,
      data: {
        id: actionId,
        type: actionData.type,
        action: actionData.action,
        entityId: actionData.entityId,
        entityType: actionData.entityType,
        payload: actionData.payload,
        priority: actionData.priority,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        dependencies: actionData.dependencies,
      },
      timestamp: Date.now(),
      lastModified: Date.now(),
      userId: actionData.userId,
      venueId: actionData.venueId,
      version: 1,
      synced: false,
      priority: actionData.priority === 'critical' ? 'high' : 'medium',
      size: JSON.stringify(actionData.payload).length,
    };

    await this.storage!.store('syncQueue', syncAction);
  }

  /**
   * Get pending sync actions
   */
  async getPendingSyncActions(userId: string): Promise<SyncQueueAction[]> {
    await this.ensureInitialized(userId);

    return await this.storage!.query<SyncQueueAction>('syncQueue', {
      index: 'status',
      key: 'pending',
      filter: (action) => action.userId === userId,
      orderBy: 'asc', // Process oldest first
    });
  }

  /**
   * Mark sync action as completed
   */
  async markSyncActionCompleted(actionId: string): Promise<void> {
    const action = await this.storage!.get<SyncQueueAction>('syncQueue', actionId);
    if (action) {
      action.data.status = 'completed';
      action.synced = true;
      action.lastModified = Date.now();
      await this.storage!.store('syncQueue', action);
    }
  }

  /**
   * Mark sync action as failed
   */
  async markSyncActionFailed(actionId: string, error: string): Promise<void> {
    const action = await this.storage!.get<SyncQueueAction>('syncQueue', actionId);
    if (action) {
      action.data.status = 'failed';
      action.data.error = error;
      action.data.retryCount += 1;
      action.data.lastRetry = Date.now();
      action.lastModified = Date.now();
      await this.storage!.store('syncQueue', action);
    }
  }

  // ====================
  // STORAGE MANAGEMENT
  // ====================

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    documentCount: number;
    byStore: Record<string, { count: number; size: number }>;
    pendingActions: number;
    mediaQueue: number;
  }> {
    await this.ensureInitialized();

    const usage = await this.storage!.getStorageUsage();
    
    // Get counts by store
    const byStore: Record<string, { count: number; size: number }> = {};
    for (const storeName of Object.keys(usage.byStore)) {
      const documents = await this.storage!.query(storeName);
      byStore[storeName] = {
        count: documents.length,
        size: usage.byStore[storeName],
      };
    }

    // Get pending counts
    const pendingActions = await this.storage!.query('syncQueue', {
      index: 'status',
      key: 'pending',
    });

    const mediaQueue = await this.storage!.query('mediaQueue', {
      index: 'uploadStatus',
      key: 'pending',
    });

    return {
      totalSize: usage.total,
      documentCount: Object.values(byStore).reduce((sum, store) => sum + store.count, 0),
      byStore,
      pendingActions: pendingActions.length,
      mediaQueue: mediaQueue.length,
    };
  }

  /**
   * Clear all data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    if (this.storage) {
      await this.storage.close();
    }
    await VolunteerStorageManager.deleteDatabase();
    this.initialized = false;
    console.log('🗑️ All volunteer data cleared');
  }
}

// Singleton instance
let volunteerServiceInstance: VolunteerService | null = null;

/**
 * Get the singleton volunteer service instance
 */
export const getVolunteerService = (): VolunteerService => {
  if (!volunteerServiceInstance) {
    volunteerServiceInstance = new VolunteerService();
  }
  return volunteerServiceInstance;
};

export default VolunteerService;