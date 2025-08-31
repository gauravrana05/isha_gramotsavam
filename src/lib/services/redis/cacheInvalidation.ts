/**
 * Cache invalidation service for volunteer system
 * Handles smart cache clearing based on data relationships
 */

import { getVolunteerCacheService } from './volunteerCache';
import { CacheKeys, CachePriority } from './volunteerCache';

export enum InvalidationTrigger {
  TEAM_STATUS_CHANGE = 'team_status_change',
  MATCH_UPDATE = 'match_update',
  PLAYER_VERIFICATION = 'player_verification',
  VENUE_ASSIGNMENT = 'venue_assignment',
  SYSTEM_CONFIG = 'system_config',
}

export interface InvalidationEvent {
  trigger: InvalidationTrigger;
  entityId: string;
  venueId?: string;
  teamId?: string;
  playerId?: string;
  matchId?: string;
  timestamp: number;
  metadata?: any;
}

export class CacheInvalidationService {
  private cacheService = getVolunteerCacheService();

  /**
   * Handle cache invalidation based on different triggers
   */
  async handleInvalidation(event: InvalidationEvent): Promise<void> {
    console.log(`🗑️ Cache invalidation triggered:`, {
      trigger: event.trigger,
      entityId: event.entityId,
      venueId: event.venueId,
      timestamp: new Date(event.timestamp).toISOString(),
    });

    try {
      switch (event.trigger) {
        case InvalidationTrigger.TEAM_STATUS_CHANGE:
          await this.invalidateTeamRelatedCache(event);
          break;
        
        case InvalidationTrigger.MATCH_UPDATE:
          await this.invalidateMatchRelatedCache(event);
          break;
        
        case InvalidationTrigger.PLAYER_VERIFICATION:
          await this.invalidatePlayerRelatedCache(event);
          break;
        
        case InvalidationTrigger.VENUE_ASSIGNMENT:
          await this.invalidateVenueRelatedCache(event);
          break;
        
        case InvalidationTrigger.SYSTEM_CONFIG:
          await this.invalidateSystemConfigCache(event);
          break;
        
        default:
          console.warn(`Unknown invalidation trigger: ${event.trigger}`);
      }
    } catch (error) {
      console.error(`Failed to handle cache invalidation:`, error);
    }
  }

  /**
   * Invalidate team-related cache
   * Triggers: Team check-in, status change, roster updates
   */
  private async invalidateTeamRelatedCache(event: InvalidationEvent): Promise<void> {
    const { venueId, teamId } = event;
    
    if (!venueId) {
      console.warn('VenueId required for team cache invalidation');
      return;
    }

    // Clear venue stats (team counts, check-in status)
    await this.cacheService.invalidateVenueCache(venueId);
    
    // Clear team summaries
    await this.cacheService.invalidateTeamCache(venueId, teamId);
    
    // Clear search results that might include this team
    await this.invalidateSearchCache(venueId, 'teams');
    
    // Clear dashboard data for all volunteers at this venue
    await this.invalidateDashboardCache(venueId);

    console.log(`✅ Team-related cache cleared for venue: ${venueId}, team: ${teamId}`);
  }

  /**
   * Invalidate match-related cache
   * Triggers: Match score updates, status changes, schedule changes
   */
  private async invalidateMatchRelatedCache(event: InvalidationEvent): Promise<void> {
    const { venueId, matchId } = event;
    
    if (!venueId) {
      console.warn('VenueId required for match cache invalidation');
      return;
    }

    // Get today's date for fixture cache
    const today = new Date().toISOString().split('T')[0];
    
    // Clear match fixtures and live data
    await this.cacheService.invalidateMatchCache(venueId, today);
    
    // Clear venue stats (match counts, completion status)
    await this.cacheService.invalidateVenueCache(venueId);
    
    // Clear dashboard data
    await this.invalidateDashboardCache(venueId);

    console.log(`✅ Match-related cache cleared for venue: ${venueId}, match: ${matchId}`);
  }

  /**
   * Invalidate player-related cache
   * Triggers: Player verification, document updates
   */
  private async invalidatePlayerRelatedCache(event: InvalidationEvent): Promise<void> {
    const { venueId, teamId, playerId } = event;
    
    if (!playerId) {
      console.warn('PlayerId required for player cache invalidation');
      return;
    }

    // Clear specific player data
    // Note: We'll implement deleteKeys method for specific player cache
    // For now, we'll clear related team and venue data
    
    if (venueId && teamId) {
      // Clear team summaries (verified player counts)
      await this.cacheService.invalidateTeamCache(venueId, teamId);
      
      // Clear venue stats (verification statistics)
      await this.cacheService.invalidateVenueCache(venueId);
      
      // Clear player search results
      await this.invalidateSearchCache(venueId, 'players');
    }

    console.log(`✅ Player-related cache cleared for player: ${playerId}`);
  }

  /**
   * Invalidate venue-related cache
   * Triggers: Venue assignment changes, configuration updates
   */
  private async invalidateVenueRelatedCache(event: InvalidationEvent): Promise<void> {
    const { venueId } = event;
    
    if (!venueId) {
      console.warn('VenueId required for venue cache invalidation');
      return;
    }

    // Clear all venue-specific data
    await this.cacheService.invalidateVenueCache(venueId);
    
    // Clear all match data for this venue
    const today = new Date().toISOString().split('T')[0];
    await this.cacheService.invalidateMatchCache(venueId, today);
    
    // Clear team data
    await this.cacheService.invalidateTeamCache(venueId);
    
    // Clear dashboard data
    await this.invalidateDashboardCache(venueId);
    
    // Clear all search results for this venue
    await this.invalidateSearchCache(venueId);

    console.log(`✅ Venue-related cache cleared for venue: ${venueId}`);
  }

  /**
   * Invalidate system configuration cache
   * Triggers: Sports config changes, system settings updates
   */
  private async invalidateSystemConfigCache(event: InvalidationEvent): Promise<void> {
    // Clear low priority configuration cache
    // We'll need to implement pattern-based deletion for config keys
    // For now, we'll implement basic cleanup
    
    console.log(`✅ System configuration cache invalidation triggered`);
  }

  /**
   * Invalidate search cache for a venue
   */
  private async invalidateSearchCache(venueId: string, type?: 'teams' | 'players'): Promise<void> {
    // This requires pattern-based deletion which we'll implement
    // For now, we'll use the existing team cache invalidation
    await this.cacheService.invalidateTeamCache(venueId);
  }

  /**
   * Invalidate dashboard cache for a venue
   */
  private async invalidateDashboardCache(venueId: string): Promise<void> {
    // Dashboard cache depends on venue stats, so clearing venue stats
    // will effectively invalidate dashboard cache
    // We could implement specific dashboard cache clearing here
  }

  /**
   * Batch invalidation for multiple events
   */
  async handleBatchInvalidation(events: InvalidationEvent[]): Promise<void> {
    const promises = events.map(event => this.handleInvalidation(event));
    await Promise.all(promises);
    
    console.log(`✅ Batch cache invalidation completed for ${events.length} events`);
  }

  /**
   * Smart invalidation based on data relationships
   * Groups related invalidations to minimize cache clearing
   */
  async smartInvalidate(events: InvalidationEvent[]): Promise<void> {
    // Group events by venue to minimize redundant cache clears
    const eventsByVenue = new Map<string, InvalidationEvent[]>();
    
    events.forEach(event => {
      const venueId = event.venueId || 'global';
      if (!eventsByVenue.has(venueId)) {
        eventsByVenue.set(venueId, []);
      }
      eventsByVenue.get(venueId)!.push(event);
    });

    // Process each venue's events together
    const promises = Array.from(eventsByVenue.entries()).map(([venueId, venueEvents]) => 
      this.processVenueEvents(venueId, venueEvents)
    );

    await Promise.all(promises);
  }

  private async processVenueEvents(venueId: string, events: InvalidationEvent[]): Promise<void> {
    // Determine what needs to be invalidated based on all events for this venue
    const needsVenueInvalidation = events.some(e => 
      [InvalidationTrigger.TEAM_STATUS_CHANGE, InvalidationTrigger.MATCH_UPDATE].includes(e.trigger)
    );
    
    const needsTeamInvalidation = events.some(e => 
      [InvalidationTrigger.TEAM_STATUS_CHANGE, InvalidationTrigger.PLAYER_VERIFICATION].includes(e.trigger)
    );
    
    const needsMatchInvalidation = events.some(e => 
      e.trigger === InvalidationTrigger.MATCH_UPDATE
    );

    // Perform consolidated invalidation
    if (venueId !== 'global') {
      if (needsVenueInvalidation) {
        await this.cacheService.invalidateVenueCache(venueId);
      }
      
      if (needsTeamInvalidation) {
        await this.cacheService.invalidateTeamCache(venueId);
      }
      
      if (needsMatchInvalidation) {
        const today = new Date().toISOString().split('T')[0];
        await this.cacheService.invalidateMatchCache(venueId, today);
      }
    }

    console.log(`✅ Smart invalidation completed for venue: ${venueId} (${events.length} events)`);
  }

  /**
   * Schedule periodic cache cleanup
   */
  scheduleCleanup(): void {
    // Clean up expired cache every 5 minutes
    setInterval(async () => {
      try {
        await this.cacheService.cleanupExpiredCache();
        console.log('🧹 Periodic cache cleanup completed');
      } catch (error) {
        console.error('Failed to perform periodic cache cleanup:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cache health and trigger cleanup if needed
   */
  async performHealthCheck(): Promise<void> {
    const health = await this.cacheService.getCacheHealth();
    
    if (!health.isHealthy) {
      console.warn('⚠️ Cache health check failed:', health);
      
      // If memory usage is too high, trigger cleanup
      if (health.totalMemory > health.memoryLimit * 0.9) { // 90% threshold
        console.log('🧹 Triggering emergency cache cleanup due to high memory usage');
        await this.cacheService.cleanupExpiredCache();
      }
    } else {
      console.log('✅ Cache health check passed:', {
        totalMemory: Math.round(health.totalMemory / 1024 / 1024) + 'MB',
        keyCount: health.keyCount,
      });
    }
  }
}

// Singleton instance
let invalidationServiceInstance: CacheInvalidationService | null = null;

export const getCacheInvalidationService = (): CacheInvalidationService => {
  if (!invalidationServiceInstance) {
    invalidationServiceInstance = new CacheInvalidationService();
  }
  return invalidationServiceInstance;
};

// Helper function to create invalidation events
export const createInvalidationEvent = (
  trigger: InvalidationTrigger,
  entityId: string,
  options: {
    venueId?: string;
    teamId?: string;
    playerId?: string;
    matchId?: string;
    metadata?: any;
  } = {}
): InvalidationEvent => ({
  trigger,
  entityId,
  timestamp: Date.now(),
  ...options,
});

export default CacheInvalidationService;