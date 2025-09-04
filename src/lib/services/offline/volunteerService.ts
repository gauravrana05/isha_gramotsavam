/**
 * High-level volunteer storage service
 * Provides clean API for common volunteer operations with offline-first approach
 * Handles sync queue management and intelligent caching
 */

import { getVolunteerStorage, VolunteerDocument, TeamRecord, PlayerRecord, MatchRecord, SyncQueueAction, MediaQueueItem, VolunteerStorageManager } from './volunteerStorage';
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
      // Wait for existing initialization to complete with timeout
      const maxWait = 5000; // 5 seconds
      const startTime = Date.now();
      while (this.initializing && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (this.initializing) {
        throw new Error('Service initialization timeout');
      }
      return;
    }

    this.initializing = true;
    try {
      // Add timeout for storage initialization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Storage initialization timeout')), 5000);
      });
      
      const storagePromise = getVolunteerStorage();
      this.storage = await Promise.race([storagePromise, timeoutPromise]) as VolunteerStorageManager;
      this.initialized = true;
      console.log('✅ Volunteer service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize volunteer service:', error);
      throw error;
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
    const binaryData: VolunteerDocument = {
      id: `binary_${mediaId}`,
      data: {
        mediaId,
        data: await data.file.arrayBuffer(),
        size: data.file.size,
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
      lastModified: Date.now(),
      version: 1,
      synced: false,
      priority: 'medium',
      size: data.file.size,
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
   * Get volunteer assignments for user
   */
  async getMyAssignments(userId: string): Promise<any[]> {
    await this.ensureInitialized(userId);
    
    const assignments = await this.storage!.query('volunteerAssignments', {
      index: 'userId',
      key: userId,
    });
    
    return assignments.map(a => a.data);
  }

  /**
   * Get volunteer assignments
   */
  async getVolunteerAssignments(userId: string): Promise<any[]> {
    await this.ensureInitialized(userId);
    
    try {
      const assignments = await this.storage!.query('volunteerAssignments', {
        filter: (assignment: any) => assignment.userId === userId
      });
      
      return assignments.map(a => (a as any).data);
    } catch (error) {
      console.error('Failed to get volunteer assignments:', error);
      return [];
    }
  }










  /**
   * Create a new team
   */
  async createTeam(data: { 
    name: string; 
    sportId: string; 
    venueId: string; 
    captainId: string; 
    description?: string; 
    createdBy: string; 
    timestamp: number;
    players?: any[];
  }, userId: string): Promise<any> {
    await this.ensureInitialized(userId);

    // Generate unique team ID
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTeam: VolunteerDocument = {
      id: teamId,
      data: {
        id: teamId,
        name: data.name,
        sportId: data.sportId,
        venueId: data.venueId,
        captainId: data.captainId,
        description: data.description || '',
        status: 'draft',
        createdBy: data.createdBy,
        createdAt: new Date(data.timestamp),
        updatedAt: new Date(data.timestamp),
        checkedIn: false,
        // Add other required fields
        genderCategory: 'mixed', // Default
        ageCategory: 'open', // Default
      },
      userId,
      venueId: data.venueId,
      timestamp: Date.now(),
      lastModified: Date.now(),
      version: 1,
      synced: false,
      priority: 'medium',
      size: JSON.stringify(data).length,
    };

    // Store team in IndexedDB
    await this.storage!.store('teams', newTeam);

    // If players provided, add them too
    if (data.players?.length) {
      for (const playerData of data.players) {
        await this.addPlayerToTeam({
          teamId,
          playerId: playerData.id,
          position: playerData.position || 'main',
          addedBy: data.createdBy,
          timestamp: data.timestamp,
        }, userId);
      }
    }

    console.log('✅ Team created offline:', teamId);
    return newTeam.data;
  }

  /**
   * Add player to team
   */
  async addPlayerToTeam(data: {
    teamId: string;
    playerId: string;
    position: string;
    addedBy: string;
    timestamp: number;
  }, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    const playerRecord: VolunteerDocument = {
      id: `${data.teamId}_${data.playerId}`,
      data: {
        id: data.playerId,
        teamId: data.teamId,
        position: data.position,
        verificationStatus: 'pending',
        addedBy: data.addedBy,
        addedAt: new Date(data.timestamp),
      },
      userId,
      timestamp: Date.now(),
      lastModified: Date.now(),
      version: 1,
      synced: false,
      priority: 'medium',
      size: JSON.stringify(data).length,
    };

    await this.storage!.store('players', playerRecord);
  }

  /**
   * Remove player from team
   */
  async removePlayerFromTeam(teamId: string, playerId: string, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    try {
      // Remove player record
      await this.storage!.delete('players', `${teamId}_${playerId}`);
      
      console.log('✅ Player removed from team offline:', playerId);
    } catch (error) {
      console.error('Failed to remove player from team:', error);
      throw error;
    }
  }

  /**
   * Update player information
   */
  async updatePlayer(playerId: string, updates: any, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    try {
      const existingPlayer = await this.storage!.get('players', playerId);
      if (!existingPlayer) {
        throw new Error('Player not found');
      }

      const updatedPlayer = {
        ...existingPlayer,
        data: {
          ...existingPlayer.data,
          ...updates,
          updatedAt: new Date(),
        },
        lastModified: Date.now(),
        synced: false,
      };

      await this.storage!.put('players', updatedPlayer);
      
      console.log('✅ Player updated offline:', playerId);
    } catch (error) {
      console.error('Failed to update player:', error);
      throw error;
    }
  }

  /**
   * Promote player to captain
   */
  async promoteCaptain(teamId: string, playerId: string, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    try {
      const team = await this.storage!.get('teams', teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const updatedTeam = {
        ...team,
        data: {
          ...team.data,
          captainId: playerId,
          updatedAt: new Date(),
        },
        lastModified: Date.now(),
        synced: false,
      };

      await this.storage!.put('teams', updatedTeam);
      
      console.log('✅ Captain promoted offline:', playerId);
    } catch (error) {
      console.error('Failed to promote captain:', error);
      throw error;
    }
  }

  /**
   * Delete media file
   */
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    try {
      // Remove from media queue and binary data
      await this.storage!.delete('mediaQueue', mediaId);
      await this.storage!.delete('binaryData', mediaId);
      
      console.log('✅ Media deleted offline:', mediaId);
    } catch (error) {
      console.error('Failed to delete media:', error);
      throw error;
    }
  }

  /**
   * Assign tournament numbers to teams
   */
  async assignTournamentNumbers(assignments: Array<{teamId: string; tournamentNumber: number}>, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    try {
      for (const assignment of assignments) {
        const team = await this.storage!.get('teams', assignment.teamId);
        if (team) {
          const updatedTeam = {
            ...team,
            data: {
              ...team.data,
              tournamentNumber: assignment.tournamentNumber,
              updatedAt: new Date(),
            },
            lastModified: Date.now(),
            synced: false,
          };

          await this.storage!.put('teams', updatedTeam);
        }
      }
      
      console.log('✅ Tournament numbers assigned offline:', assignments.length);
    } catch (error) {
      console.error('Failed to assign tournament numbers:', error);
      throw error;
    }
  }

  /**
   * Get individual match details
   */
  async getMatch(matchId: string, userId: string): Promise<any> {
    await this.ensureInitialized(userId);

    try {
      const match = await this.storage!.get('matches', matchId);
      return match?.data || null;
    } catch (error) {
      console.error('Failed to get match:', error);
      return null;
    }
  }

  /**
   * Update team status
   */
  async updateTeamStatus(data: { teamId: string; status: string; updatedBy: string; timestamp: number; notes?: string }, userId: string): Promise<void> {
    await this.ensureInitialized(userId);

    // Update team record
    const team = await this.storage!.get('teams', data.teamId);
    if (team) {
      team.data.status = data.status;
      team.data.updatedBy = data.updatedBy;
      team.data.updatedAt = new Date(data.timestamp);
      if (data.notes) {
        team.data.statusNotes = data.notes;
      }

      await this.storage!.store('teams', team);
    }
  }



  /**
   * Get venue details
   */
  async getVenueDetails(venueId: string, userId: string): Promise<any> {
    await this.ensureInitialized(userId);
    
    try {
      // Add timeout for individual operations
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });
      
      const venuePromise = this.storage!.get('venueConfigs', venueId);
      const venue = await Promise.race([venuePromise, timeoutPromise]);
      
      return (venue as any)?.data || null;
    } catch (error) {
      console.error('Failed to get venue details:', error);
      return null;
    }
  }

  /**
   * Get venue stats
   */
  async getVenueStats(venueId: string, userId: string): Promise<any> {
    await this.ensureInitialized(userId);
    
    try {
      // Add timeout and calculate stats from cached data
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ totalTeams: 0, checkedInTeams: 0, totalMatches: 0, completedMatches: 0, progress: 0 }), 3000);
      });
      
      const statsPromise = (async () => {
        const teams = await this.getVenueTeams(venueId, userId);
        const matches = await this.getVenueMatches(venueId, userId);
        
        const totalMatches = matches?.length || 0;
        const completedMatches = matches?.filter(m => m.status === 'completed')?.length || 0;
        
        return {
          totalTeams: teams?.length || 0,
          checkedInTeams: teams?.filter(t => t.checkedIn)?.length || 0,
          totalMatches,
          completedMatches,
          progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
          matchesCompleted: completedMatches,
          matchesTotal: totalMatches,
        };
      })();
      
      return await Promise.race([statsPromise, timeoutPromise]);
    } catch (error) {
      console.error('Failed to get venue stats:', error);
      return { totalTeams: 0, checkedInTeams: 0, totalMatches: 0, completedMatches: 0, progress: 0 };
    }
  }

  /**
   * Get teams for venue
   */
  async getVenueTeams(venueId: string, userId: string): Promise<any[]> {
    await this.ensureInitialized(userId);
    
    try {
      const timeoutPromise = new Promise<any[]>((resolve) => {
        setTimeout(() => resolve([]), 3000);
      });
      
      const teamsPromise = this.storage!.query('teams', {
        filter: (team: any) => team.userId === userId && team.data?.venueId === venueId
      });
      
      const teams = await Promise.race([teamsPromise, timeoutPromise]);
      return Array.isArray(teams) ? teams.map(team => team.data || team) : [];
    } catch (error) {
      console.error('Failed to get venue teams:', error);
      return [];
    }
  }

  /**
   * Get matches for venue
   */
  async getVenueMatches(venueId: string, userId: string): Promise<any[]> {
    await this.ensureInitialized(userId);
    
    try {
      const timeoutPromise = new Promise<any[]>((resolve) => {
        setTimeout(() => resolve([]), 3000);
      });
      
      const matchesPromise = this.storage!.query('matches', {
        filter: (match: any) => match.userId === userId && match.data?.venueId === venueId
      });
      
      const matches = await Promise.race([matchesPromise, timeoutPromise]);
      return Array.isArray(matches) ? matches.map(match => match.data || match) : [];
    } catch (error) {
      console.error('Failed to get venue matches:', error);
      return [];
    }
  }

  /**
   * Get fixtures for venue
   */
  async getVenueFixtures(venueId: string, userId: string): Promise<any[]> {
    await this.ensureInitialized(userId);
    
    try {
      const timeoutPromise = new Promise<any[]>((resolve) => {
        setTimeout(() => resolve([]), 3000);
      });
      
      const fixturesPromise = (async () => {
        const matches = await this.getVenueMatches(venueId, userId);
        // Group matches by fixture
        const fixturesMap = new Map();
        
        matches.forEach(match => {
          if (match.fixture) {
            const fixtureId = match.fixture.id;
            if (!fixturesMap.has(fixtureId)) {
              fixturesMap.set(fixtureId, {
                ...match.fixture,
                matches: [],
                stats: { progress: 0, matchesCompleted: 0, matchesTotal: 0 }
              });
            }
            fixturesMap.get(fixtureId).matches.push(match);
          }
        });
        
        // Add stats to each fixture
        fixturesMap.forEach(fixture => {
          const completedMatches = fixture.matches.filter(m => m.status === 'completed').length;
          const totalMatches = fixture.matches.length;
          fixture.stats = {
            matchesCompleted: completedMatches,
            matchesTotal: totalMatches,
            progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
          };
        });
        
        return Array.from(fixturesMap.values());
      })();
      
      return await Promise.race([fixturesPromise, timeoutPromise]);
    } catch (error) {
      console.error('Failed to get venue fixtures:', error);
      return [];
    }
  }

  /**
   * Get team details with players
   */
  async getTeamDetails(teamId: string, userId: string): Promise<any> {
    await this.ensureInitialized(userId);
    
    try {
      const team = await this.storage!.get('teams', teamId);
      if (!team || team.userId !== userId) return null;
      
      // Get players for this team
      const players = await this.storage!.query('players', {
        filter: (player: any) => player.userId === userId && player.data?.teamId === teamId
      });
      const teamPlayers = players.map(player => player.data);
      
      return {
        ...team.data,
        players: teamPlayers
      };
    } catch (error) {
      console.error('Failed to get team details:', error);
      return null;
    }
  }

  /**
   * Get matches for venue with filters
   */
  async getMatchesForVenue(venueId: string, date?: string, userId?: string): Promise<any[]> {
    if (!userId) return [];
    
    await this.ensureInitialized(userId);
    
    try {
      const matches = await this.getVenueMatches(venueId, userId);
      
      if (date) {
        return matches.filter(match => {
          const matchDate = new Date(match.scheduledTime || match.createdAt);
          const filterDate = new Date(date);
          return matchDate.toDateString() === filterDate.toDateString();
        });
      }
      
      return matches;
    } catch (error) {
      console.error('Failed to get matches for venue:', error);
      return [];
    }
  }

  /**
   * Get match details
   */
  async getMatchDetails(matchId: string, userId: string): Promise<any> {
    await this.ensureInitialized(userId);
    
    try {
      const match = await this.storage!.get('matches', matchId);
      if (!match || match.userId !== userId) return null;
      
      return match.data;
    } catch (error) {
      console.error('Failed to get match details:', error);
      return null;
    }
  }

  /**
   * Cache management methods for backend integration
   */
  async cacheVenueData(userId: string, venueData: any): Promise<void> {
    await this.ensureInitialized(userId);
    
    if (!venueData) return;
    
    try {
      // Cache venue details
      await this.storage!.store('venueConfigs', {
        id: venueData.id,
        data: venueData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        version: 1,
        synced: false,
        priority: 'medium' as const,
        size: JSON.stringify(venueData).length,
        userId,
      });
      
      // Cache related teams if included
      if (venueData.teams) {
        for (const team of venueData.teams) {
          await this.cacheTeamData(userId, team);
        }
      }
      
      // Cache related matches if included
      if (venueData.matches) {
        for (const match of venueData.matches) {
          await this.cacheMatchData(userId, match);
        }
      }
      
      console.log('✅ Venue data cached:', venueData.id);
    } catch (error) {
      console.error('Failed to cache venue data:', error);
    }
  }

  async cacheTeamData(userId: string, teamData: any): Promise<void> {
    await this.ensureInitialized(userId);
    
    try {
      await this.storage!.store('teams', {
        id: teamData.id,
        data: teamData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        version: 1,
        synced: false,
        priority: 'medium' as const,
        size: JSON.stringify(teamData).length,
        userId,
        venueId: teamData.venueId,
      });
      
      // Cache players if included
      if (teamData.players) {
        for (const player of teamData.players) {
          await this.cachePlayerData(userId, player);
        }
      }
      
      console.log('✅ Team data cached:', teamData.id);
    } catch (error) {
      console.error('Failed to cache team data:', error);
    }
  }

  async cacheMatchData(userId: string, matchData: any): Promise<void> {
    await this.ensureInitialized(userId);
    
    try {
      await this.storage!.store('matches', {
        id: matchData.id,
        data: matchData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        version: 1,
        synced: false,
        priority: 'medium' as const,
        size: JSON.stringify(matchData).length,
        userId,
        venueId: matchData.venueId,
      });
      
      console.log('✅ Match data cached:', matchData.id);
    } catch (error) {
      console.error('Failed to cache match data:', error);
    }
  }

  async cachePlayerData(userId: string, playerData: any): Promise<void> {
    await this.ensureInitialized(userId);
    
    try {
      await this.storage!.store('players', {
        id: playerData.id,
        data: playerData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        version: 1,
        synced: false,
        priority: 'medium' as const,
        size: JSON.stringify(playerData).length,
        userId,
        teamId: playerData.teamId,
      });
      
      console.log('✅ Player data cached:', playerData.id);
    } catch (error) {
      console.error('Failed to cache player data:', error);
    }
  }

  async cacheFixtureData(userId: string, fixtureData: any): Promise<void> {
    await this.ensureInitialized(userId);
    
    try {
      await this.storage!.store('matches', {
        id: fixtureData.id,
        data: fixtureData,
        timestamp: Date.now(),
        lastModified: Date.now(),
        version: 1,
        synced: false,
        priority: 'medium' as const,
        size: JSON.stringify(fixtureData).length,
        userId,
        venueId: fixtureData.venueId,
      });
      
      console.log('✅ Fixture data cached:', fixtureData.id);
    } catch (error) {
      console.error('Failed to cache fixture data:', error);
    }
  }

  /**
   * Get volunteer service instance for backend use
   */
  static async getServiceForBackend(): Promise<VolunteerService> {
    const service = new VolunteerService();
    return service;
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