/**
 * Volunteer-specific Redis caching service
 * Implements priority-based caching with 30MB limit
 * Cache distribution: Critical(15MB) + High(8MB) + Medium(5MB) + Low(2MB)
 */

import { redis, safeRedisOperation } from '@/lib/redis';
import { z } from 'zod';

// Cache priority levels with memory allocation
export enum CachePriority {
  CRITICAL = 'critical',  // 15MB - Venue stats, team summaries, today's fixtures
  HIGH = 'high',          // 8MB - Search results, player data, match schedules
  MEDIUM = 'medium',      // 5MB - User sessions, dashboard data
  LOW = 'low'            // 2MB - Configuration, system settings
}

// Cache key patterns
export const CacheKeys = {
  // Critical cache keys (15MB allocation)
  venue: {
    stats: (venueId: string) => `venue:${venueId}:stats`,
    teams: (venueId: string) => `venue:${venueId}:teams:summary`,
    fixtures: (venueId: string, date: string) => `venue:${venueId}:fixtures:${date}`,
    liveMatches: (venueId: string) => `venue:${venueId}:live:matches`,
  },
  
  // High priority cache keys (8MB allocation)
  search: {
    teams: (venueId: string, query: string) => `search:teams:${venueId}:${query}`,
    players: (venueId: string, query: string) => `search:players:${venueId}:${query}`,
  },
  player: {
    details: (playerId: string) => `player:${playerId}:details`,
    verification: (playerId: string) => `player:${playerId}:verification`,
  },
  match: {
    schedule: (venueId: string, date: string) => `match:schedule:${venueId}:${date}`,
    events: (matchId: string) => `match:${matchId}:events`,
  },
  
  // Medium priority cache keys (5MB allocation)
  session: {
    user: (userId: string) => `session:${userId}`,
    volunteer: (userId: string) => `session:volunteer:${userId}`,
  },
  dashboard: {
    data: (userId: string, venueId: string) => `dashboard:${userId}:${venueId}`,
    summary: (venueId: string) => `dashboard:summary:${venueId}`,
  },
  
  // Low priority cache keys (2MB allocation)
  config: {
    sports: () => 'config:sports',
    venues: () => 'config:venues',
    system: () => 'config:system',
  },
  metadata: {
    version: () => 'metadata:version',
    lastSync: (userId: string) => `metadata:lastSync:${userId}`,
  }
} as const;

// Cache TTL (Time To Live) configurations
export const CacheTTL = {
  [CachePriority.CRITICAL]: {
    venue_stats: 5 * 60,      // 5 minutes
    team_summaries: 15 * 60,  // 15 minutes
    fixtures: 30 * 60,        // 30 minutes
    live_matches: 2 * 60,     // 2 minutes
  },
  [CachePriority.HIGH]: {
    search_results: 10 * 60,  // 10 minutes
    player_data: 20 * 60,     // 20 minutes
    match_schedule: 60 * 60,  // 1 hour
  },
  [CachePriority.MEDIUM]: {
    user_session: 30 * 60,    // 30 minutes
    dashboard_data: 15 * 60,  // 15 minutes
  },
  [CachePriority.LOW]: {
    config: 24 * 60 * 60,     // 24 hours
    metadata: 12 * 60 * 60,   // 12 hours
  }
} as const;

// Type definitions for cached data structures
export interface VenueStats {
  venueId: string;
  totalTeams: number;
  checkedInTeams: number;
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  lastUpdated: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  sport: string;
  status: 'registered' | 'checked_in' | 'competing' | 'eliminated' | 'winner';
  playerCount: number;
  verifiedPlayers: number;
  lastActivity: number;
}

export interface PlayerData {
  id: string;
  name: string;
  teamId: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  documents: string[];
  lastUpdated: number;
}

export interface MatchFixture {
  id: string;
  teams: { id: string; name: string }[];
  sport: string;
  venue: string;
  scheduledTime: number;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
  score?: any;
}

export class VolunteerCacheService {
  private readonly MEMORY_LIMITS = {
    [CachePriority.CRITICAL]: 15 * 1024 * 1024,  // 15MB
    [CachePriority.HIGH]: 8 * 1024 * 1024,       // 8MB
    [CachePriority.MEDIUM]: 5 * 1024 * 1024,     // 5MB
    [CachePriority.LOW]: 2 * 1024 * 1024,        // 2MB
  };

  /**
   * Cache venue statistics with critical priority
   */
  async cacheVenueStats(venueId: string, stats: VenueStats): Promise<void> {
    const key = CacheKeys.venue.stats(venueId);
    const ttl = CacheTTL[CachePriority.CRITICAL].venue_stats;
    
    await this.setWithPriority(key, stats, ttl, CachePriority.CRITICAL);
  }

  async getVenueStats(venueId: string): Promise<VenueStats | null> {
    const key = CacheKeys.venue.stats(venueId);
    return await this.get<VenueStats>(key);
  }

  /**
   * Cache team summaries with critical priority
   */
  async cacheTeamSummaries(venueId: string, teams: TeamSummary[]): Promise<void> {
    const key = CacheKeys.venue.teams(venueId);
    const ttl = CacheTTL[CachePriority.CRITICAL].team_summaries;
    
    await this.setWithPriority(key, teams, ttl, CachePriority.CRITICAL);
  }

  async getTeamSummaries(venueId: string): Promise<TeamSummary[] | null> {
    const key = CacheKeys.venue.teams(venueId);
    return await this.get<TeamSummary[]>(key);
  }

  /**
   * Cache today's fixtures with critical priority
   */
  async cacheFixtures(venueId: string, date: string, fixtures: MatchFixture[]): Promise<void> {
    const key = CacheKeys.venue.fixtures(venueId, date);
    const ttl = CacheTTL[CachePriority.CRITICAL].fixtures;
    
    await this.setWithPriority(key, fixtures, ttl, CachePriority.CRITICAL);
  }

  async getFixtures(venueId: string, date: string): Promise<MatchFixture[] | null> {
    const key = CacheKeys.venue.fixtures(venueId, date);
    return await this.get<MatchFixture[]>(key);
  }

  /**
   * Cache search results with high priority
   */
  async cacheTeamSearch(venueId: string, query: string, results: TeamSummary[]): Promise<void> {
    const key = CacheKeys.search.teams(venueId, query);
    const ttl = CacheTTL[CachePriority.HIGH].search_results;
    
    await this.setWithPriority(key, results, ttl, CachePriority.HIGH);
  }

  async getTeamSearch(venueId: string, query: string): Promise<TeamSummary[] | null> {
    const key = CacheKeys.search.teams(venueId, query);
    return await this.get<TeamSummary[]>(key);
  }

  /**
   * Cache player data with high priority
   */
  async cachePlayerData(playerId: string, data: PlayerData): Promise<void> {
    const key = CacheKeys.player.details(playerId);
    const ttl = CacheTTL[CachePriority.HIGH].player_data;
    
    await this.setWithPriority(key, data, ttl, CachePriority.HIGH);
  }

  async getPlayerData(playerId: string): Promise<PlayerData | null> {
    const key = CacheKeys.player.details(playerId);
    return await this.get<PlayerData>(key);
  }

  /**
   * Cache user session with medium priority
   */
  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    const key = CacheKeys.session.user(userId);
    const ttl = CacheTTL[CachePriority.MEDIUM].user_session;
    
    await this.setWithPriority(key, sessionData, ttl, CachePriority.MEDIUM);
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = CacheKeys.session.user(userId);
    return await this.get<any>(key);
  }

  /**
   * Generic cache operations with priority management
   */
  private async setWithPriority(
    key: string,
    value: any,
    ttl: number,
    priority: CachePriority
  ): Promise<void> {
    await safeRedisOperation(
      async (redisClient) => {
        const serializedValue = JSON.stringify({
          data: value,
          priority,
          timestamp: Date.now(),
          size: JSON.stringify(value).length,
        });

        // Set with TTL
        await redisClient.setex(key, ttl, serializedValue);
        
        // Track memory usage by priority
        await this.trackMemoryUsage(priority, JSON.stringify(value).length);
      },
      async () => {
        console.warn(`Failed to cache data for key: ${key}`);
      }
    );
  }

  private async get<T>(key: string): Promise<T | null> {
    return await safeRedisOperation(
      async (redisClient) => {
        const cached = await redisClient.get(key);
        if (!cached) return null;

        try {
          const parsed = JSON.parse(cached);
          return parsed.data as T;
        } catch (error) {
          console.warn(`Failed to parse cached data for key: ${key}`, error);
          return null;
        }
      },
      async () => null
    );
  }

  /**
   * Cache invalidation methods
   */
  async invalidateVenueCache(venueId: string): Promise<void> {
    const keysToDelete = [
      CacheKeys.venue.stats(venueId),
      CacheKeys.venue.teams(venueId),
    ];

    await this.deleteKeys(keysToDelete);
  }

  async invalidateTeamCache(venueId: string, teamId?: string): Promise<void> {
    const keysToDelete = [
      CacheKeys.venue.teams(venueId),
      CacheKeys.venue.stats(venueId),
    ];

    // If specific team, also clear search cache
    if (teamId) {
      // Clear all search results for this venue (pattern deletion)
      await this.deletePattern(`search:teams:${venueId}:*`);
    }

    await this.deleteKeys(keysToDelete);
  }

  async invalidateMatchCache(venueId: string, date?: string): Promise<void> {
    const keysToDelete = [
      CacheKeys.venue.stats(venueId),
      CacheKeys.venue.liveMatches(venueId),
    ];

    if (date) {
      keysToDelete.push(CacheKeys.venue.fixtures(venueId, date));
    }

    await this.deleteKeys(keysToDelete);
  }

  /**
   * Memory management
   */
  private async trackMemoryUsage(priority: CachePriority, size: number): Promise<void> {
    await safeRedisOperation(
      async (redisClient) => {
        const usageKey = `memory:usage:${priority}`;
        await redisClient.incrby(usageKey, size);
        await redisClient.expire(usageKey, 3600); // 1 hour expiry
      },
      async () => {
        // Silently fail memory tracking
      }
    );
  }

  async getMemoryUsage(): Promise<Record<CachePriority, number>> {
    const usage: Record<CachePriority, number> = {
      [CachePriority.CRITICAL]: 0,
      [CachePriority.HIGH]: 0,
      [CachePriority.MEDIUM]: 0,
      [CachePriority.LOW]: 0,
    };

    for (const priority of Object.values(CachePriority)) {
      usage[priority] = await safeRedisOperation(
        async (redisClient) => {
          const usageKey = `memory:usage:${priority}`;
          const result = await redisClient.get(usageKey);
          return result ? parseInt(result, 10) : 0;
        },
        async () => 0
      );
    }

    return usage;
  }

  /**
   * Cleanup and maintenance
   */
  async cleanupExpiredCache(): Promise<void> {
    // This will be handled automatically by Redis TTL
    // But we can implement custom cleanup logic here if needed
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    await safeRedisOperation(
      async (redisClient) => {
        await redisClient.del(...keys);
      },
      async () => {
        console.warn(`Failed to delete cache keys: ${keys.join(', ')}`);
      }
    );
  }

  private async deletePattern(pattern: string): Promise<void> {
    await safeRedisOperation(
      async (redisClient) => {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      },
      async () => {
        console.warn(`Failed to delete cache pattern: ${pattern}`);
      }
    );
  }

  /**
   * Health check and diagnostics
   */
  async getCacheHealth(): Promise<{
    isHealthy: boolean;
    memoryUsage: Record<CachePriority, number>;
    totalMemory: number;
    memoryLimit: number;
    keyCount: number;
  }> {
    const memoryUsage = await this.getMemoryUsage();
    const totalMemory = Object.values(memoryUsage).reduce((sum, usage) => sum + usage, 0);
    const memoryLimit = 30 * 1024 * 1024; // 30MB total limit

    let keyCount = 0;
    await safeRedisOperation(
      async (redisClient) => {
        const keys = await redisClient.keys('*');
        keyCount = keys.length;
      },
      async () => {
        keyCount = -1; // Indicates error
      }
    );

    return {
      isHealthy: totalMemory < memoryLimit && keyCount !== -1,
      memoryUsage,
      totalMemory,
      memoryLimit,
      keyCount,
    };
  }
}

// Singleton instance
let cacheServiceInstance: VolunteerCacheService | null = null;

export const getVolunteerCacheService = (): VolunteerCacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new VolunteerCacheService();
  }
  return cacheServiceInstance;
};

export default VolunteerCacheService;