# Offline Implementation for Player and Captain Sections

## Overview

Implement comprehensive offline functionality for player and captain sections of the Isha Gramotsavam application, following the established offline architecture used in the volunteer section.

## Current Offline Architecture Reference

The application already has a robust offline system implemented primarily for volunteers:
- **OfflineContext** at `/src/context/OfflineContext.tsx` - Core offline state management
- **Service Workers** for background sync and caching
- **IndexedDB storage** via storage manager
- **Background sync** for queued actions
- **Conflict resolution** for data synchronization
- **Media upload queue** for handling offline media uploads

## Requirements

### 1. Player Section Offline Functionality

**User Stories**:
- As a player, I want to view my teams and match schedules even when offline
- As a player, I want to see my match history and results when offline
- As a player, I want to upload match photos/videos that sync when online
- As a player, I want to receive notifications about match updates when I come back online
- As a player, I want to update my profile information offline and sync later

**Core Offline Features Needed**:

#### Data Caching
- **Team Information**: Current team details, teammates, captain info
- **Match Data**: Upcoming matches, past results, fixture schedules
- **Profile Data**: Personal information, statistics, achievements
- **Media**: Match photos, team photos, cached for offline viewing
- **Notifications**: Recent notifications for offline reading

#### Offline Actions Queue
- **Profile Updates**: Personal information changes
- **Media Uploads**: Match photos, team photos, personal photos
- **Team Interactions**: Responding to team invitations, status updates
- **Notification Interactions**: Mark as read, respond to notifications

### 2. Captain Section Offline Functionality

**User Stories**:
- As a captain, I want to manage my team roster even when offline
- As a captain, I want to view fixture schedules and plan team coordination offline
- As a captain, I want to upload team media that syncs when online
- As a captain, I want to see player verification status even offline
- As a captain, I want to track team performance and statistics offline

**Core Offline Features Needed**:

#### Data Caching
- **Team Management**: Full team roster, player details, verification status
- **Match Management**: Team fixtures, match results, tournament brackets
- **Team Media**: Team photos, match videos, achievement galleries
- **Communication**: Team notifications, captain announcements
- **Analytics**: Team statistics, player performance data

#### Offline Actions Queue
- **Team Management**: Player invitations, roster changes, team updates
- **Media Management**: Upload team photos, match videos, team media
- **Communication**: Send team notifications, announcements
- **Match Updates**: Submit match results, update team status

## Technical Implementation Details

### Step 1: Extend OfflineContext for Player/Captain

**File**: `/src/context/PlayerOfflineContext.tsx`
```typescript
'use client';

import React, { createContext, useContext } from 'react';
import { OfflineContext } from './OfflineContext';

// Player-specific offline data types
export interface PlayerOfflineData {
  teams: PlayerTeam[];
  matches: PlayerMatch[];
  profile: PlayerProfile;
  media: PlayerMedia[];
  notifications: PlayerNotification[];
  statistics: PlayerStats;
}

// Player-specific pending actions
export interface PlayerPendingAction extends PendingAction {
  type: 'profile_update' | 'media_upload' | 'team_response' | 'notification_read';
  playerData?: any;
}

export interface PlayerOfflineContextType extends OfflineContextType {
  // Player-specific data
  playerData: PlayerOfflineData;
  
  // Player-specific actions
  cachePlayerData: (data: Partial<PlayerOfflineData>) => Promise<void>;
  queuePlayerAction: (action: PlayerPendingAction) => Promise<void>;
  getPlayerCacheInfo: () => Promise<PlayerCacheInfo>;
}

const PlayerOfflineContext = createContext<PlayerOfflineContextType | null>(null);

export const PlayerOfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Extend base offline functionality with player-specific features
  const baseOfflineContext = useContext(OfflineContext);
  
  // Player-specific implementations
  const cachePlayerData = async (data: Partial<PlayerOfflineData>) => {
    // Implementation for caching player-specific data
  };
  
  const queuePlayerAction = async (action: PlayerPendingAction) => {
    // Implementation for queuing player-specific actions
  };
  
  // ... additional player-specific methods
  
  return (
    <PlayerOfflineContext.Provider value={playerOfflineContextValue}>
      {children}
    </PlayerOfflineContext.Provider>
  );
};

export const usePlayerOffline = () => {
  const context = useContext(PlayerOfflineContext);
  if (!context) {
    throw new Error('usePlayerOffline must be used within PlayerOfflineProvider');
  }
  return context;
};
```

**File**: `/src/context/CaptainOfflineContext.tsx`
```typescript
// Similar structure for captain-specific offline functionality
export interface CaptainOfflineData {
  team: CaptainTeam;
  players: TeamPlayer[];
  matches: TeamMatch[];
  media: TeamMedia[];
  communications: TeamCommunication[];
  analytics: TeamAnalytics;
}

export interface CaptainPendingAction extends PendingAction {
  type: 'team_update' | 'player_invite' | 'media_upload' | 'team_communication';
  teamData?: any;
}

// Similar provider and hook structure
```

### Step 2: Create Storage Services

**File**: `/src/lib/services/offline/playerStorageService.ts`
```typescript
import { getStorageManager } from './storageManager';

export class PlayerStorageService {
  private storage = getStorageManager();
  
  // Player data storage methods
  async cacheTeams(teams: PlayerTeam[]): Promise<void> {
    await this.storage.set('player_teams', teams);
  }
  
  async getCachedTeams(): Promise<PlayerTeam[]> {
    return await this.storage.get('player_teams') || [];
  }
  
  async cacheMatches(matches: PlayerMatch[]): Promise<void> {
    await this.storage.set('player_matches', matches);
  }
  
  async getCachedMatches(): Promise<PlayerMatch[]> {
    return await this.storage.get('player_matches') || [];
  }
  
  async cacheProfile(profile: PlayerProfile): Promise<void> {
    await this.storage.set('player_profile', profile);
  }
  
  async getCachedProfile(): Promise<PlayerProfile | null> {
    return await this.storage.get('player_profile');
  }
  
  // Media caching
  async cacheMedia(media: PlayerMedia[]): Promise<void> {
    await this.storage.set('player_media', media);
  }
  
  async getCachedMedia(): Promise<PlayerMedia[]> {
    return await this.storage.get('player_media') || [];
  }
  
  // Notifications
  async cacheNotifications(notifications: PlayerNotification[]): Promise<void> {
    await this.storage.set('player_notifications', notifications);
  }
  
  async getCachedNotifications(): Promise<PlayerNotification[]> {
    return await this.storage.get('player_notifications') || [];
  }
}

export const getPlayerStorageService = () => new PlayerStorageService();
```

**File**: `/src/lib/services/offline/captainStorageService.ts`
```typescript
// Similar structure for captain-specific storage
export class CaptainStorageService {
  // Team management storage
  async cacheTeam(team: CaptainTeam): Promise<void> { }
  async getCachedTeam(): Promise<CaptainTeam | null> { }
  
  // Player management storage
  async cachePlayers(players: TeamPlayer[]): Promise<void> { }
  async getCachedPlayers(): Promise<TeamPlayer[]> { }
  
  // Match management storage
  async cacheMatches(matches: TeamMatch[]): Promise<void> { }
  async getCachedMatches(): Promise<TeamMatch[]> { }
  
  // Team communications
  async cacheCommunications(communications: TeamCommunication[]): Promise<void> { }
  async getCachedCommunications(): Promise<TeamCommunication[]> { }
}
```

### Step 3: Background Sync Extensions

**File**: `/src/lib/services/offline/playerBackgroundSync.ts`
```typescript
import { getBackgroundSyncManager } from './backgroundSync';

export class PlayerBackgroundSync {
  private syncManager = getBackgroundSyncManager();
  
  // Sync player-specific data
  async syncPlayerData(): Promise<void> {
    try {
      // Sync teams
      await this.syncTeams();
      
      // Sync matches
      await this.syncMatches();
      
      // Sync profile
      await this.syncProfile();
      
      // Sync media
      await this.syncMedia();
      
      // Sync notifications
      await this.syncNotifications();
      
    } catch (error) {
      console.error('Player data sync failed:', error);
      throw error;
    }
  }
  
  private async syncTeams(): Promise<void> {
    // Implementation for syncing team data
  }
  
  private async syncMatches(): Promise<void> {
    // Implementation for syncing match data
  }
  
  private async syncProfile(): Promise<void> {
    // Implementation for syncing profile data
  }
  
  private async syncMedia(): Promise<void> {
    // Implementation for syncing media uploads
  }
  
  private async syncNotifications(): Promise<void> {
    // Implementation for syncing notifications
  }
}

export const getPlayerBackgroundSync = () => new PlayerBackgroundSync();
```

### Step 4: UI Components for Offline Status

**File**: `/src/components/player/PlayerOfflineIndicator.tsx`
```typescript
'use client';

import { usePlayerOffline } from '@/context/PlayerOfflineContext';
import { OfflineIndicator } from '@/components/system/OfflineIndicator';

export const PlayerOfflineIndicator: React.FC = () => {
  const { 
    isOnline, 
    pendingActions, 
    syncStatus, 
    lastSyncTime 
  } = usePlayerOffline();
  
  return (
    <OfflineIndicator
      isOnline={isOnline}
      pendingCount={pendingActions.length}
      syncStatus={syncStatus}
      lastSync={lastSyncTime}
      context="player"
    />
  );
};
```

**File**: `/src/components/captain/CaptainOfflineIndicator.tsx`
```typescript
// Similar structure for captain offline indicator
```

### Step 5: Integration into Layouts

**Update**: `/src/app/[lang]/player/layout.tsx`
```typescript
import { PlayerOfflineProvider } from '@/context/PlayerOfflineContext';
import { PlayerOfflineIndicator } from '@/components/player/PlayerOfflineIndicator';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerOfflineProvider>
      <div className="md:min-h-screen bg-gray-50">
        {/* Existing header and sidebar */}
        
        {/* Offline indicator */}
        <PlayerOfflineIndicator />
        
        <div className="...">
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </PlayerOfflineProvider>
  );
}
```

**Update**: `/src/app/[lang]/captain/layout.tsx`
```typescript
import { CaptainOfflineProvider } from '@/context/CaptainOfflineContext';
import { CaptainOfflineIndicator } from '@/components/captain/CaptainOfflineIndicator';

// Similar integration for captain layout
```

### Step 6: Data Preloading Strategies

**File**: `/src/lib/services/offline/playerPreloader.ts`
```typescript
import { getPlayerStorageService } from './playerStorageService';
import { api } from '@/server/trpc/react';

export interface PlayerPreloadProgress {
  teams: boolean;
  matches: boolean;
  profile: boolean;
  media: boolean;
  notifications: boolean;
  overall: number; // percentage
}

export class PlayerPreloader {
  private storage = getPlayerStorageService();
  
  async preloadPlayerData(userId: string): Promise<PlayerPreloadProgress> {
    const progress: PlayerPreloadProgress = {
      teams: false,
      matches: false,
      profile: false,
      media: false,
      notifications: false,
      overall: 0
    };
    
    try {
      // Preload teams
      const teams = await this.fetchAndCacheTeams(userId);
      progress.teams = true;
      progress.overall = 20;
      
      // Preload matches
      const matches = await this.fetchAndCacheMatches(userId);
      progress.matches = true;
      progress.overall = 40;
      
      // Preload profile
      const profile = await this.fetchAndCacheProfile(userId);
      progress.profile = true;
      progress.overall = 60;
      
      // Preload media
      const media = await this.fetchAndCacheMedia(userId);
      progress.media = true;
      progress.overall = 80;
      
      // Preload notifications
      const notifications = await this.fetchAndCacheNotifications(userId);
      progress.notifications = true;
      progress.overall = 100;
      
    } catch (error) {
      console.error('Player preloading failed:', error);
    }
    
    return progress;
  }
  
  private async fetchAndCacheTeams(userId: string): Promise<void> {
    // Fetch teams from API and cache
  }
  
  private async fetchAndCacheMatches(userId: string): Promise<void> {
    // Fetch matches from API and cache
  }
  
  // Additional preloading methods...
}

export const getPlayerPreloader = () => new PlayerPreloader();
```

### Step 7: Conflict Resolution

**File**: `/src/lib/services/offline/playerConflictResolver.ts`
```typescript
export class PlayerConflictResolver {
  // Resolve conflicts for player data
  async resolvePlayerProfileConflict(
    localProfile: PlayerProfile,
    serverProfile: PlayerProfile
  ): Promise<PlayerProfile> {
    // Conflict resolution logic for player profiles
    // Prefer server data for critical fields, merge timestamps, etc.
  }
  
  async resolveTeamDataConflict(
    localTeam: PlayerTeam,
    serverTeam: PlayerTeam
  ): Promise<PlayerTeam> {
    // Conflict resolution logic for team data
  }
  
  async resolveMediaConflict(
    localMedia: PlayerMedia,
    serverMedia: PlayerMedia
  ): Promise<PlayerMedia> {
    // Conflict resolution logic for media uploads
  }
}
```

### Step 8: Service Worker Extensions

**Update**: `/public/sw.js`
```javascript
// Add player and captain specific caching strategies
const PLAYER_CACHE_NAME = 'player-data-v1';
const CAPTAIN_CACHE_NAME = 'captain-data-v1';

// Cache player-specific routes
const PLAYER_ROUTES = [
  '/api/trpc/players.getTeams',
  '/api/trpc/players.getMatches',
  '/api/trpc/players.getProfile',
  '/api/trpc/players.getMedia',
  '/api/trpc/players.getNotifications'
];

// Cache captain-specific routes
const CAPTAIN_ROUTES = [
  '/api/trpc/teams.getMyTeam',
  '/api/trpc/teams.getPlayers', 
  '/api/trpc/teams.getMatches',
  '/api/trpc/teams.getMedia',
  '/api/trpc/teams.getCommunications'
];

// Background sync for player actions
self.addEventListener('sync', event => {
  if (event.tag === 'player-data-sync') {
    event.waitUntil(syncPlayerData());
  } else if (event.tag === 'captain-data-sync') {
    event.waitUntil(syncCaptainData());
  }
});

async function syncPlayerData() {
  // Sync pending player actions
}

async function syncCaptainData() {
  // Sync pending captain actions
}
```

## Performance Optimization

### Smart Caching Strategy
- **Critical Data First**: Cache essential data (teams, upcoming matches) with high priority
- **Lazy Loading**: Load less critical data (historical matches, old media) on demand
- **Size Management**: Implement cache size limits and LRU eviction policies

### Background Sync Prioritization
- **High Priority**: Profile updates, team status changes, urgent communications
- **Medium Priority**: Media uploads, team updates, match results
- **Low Priority**: Statistics sync, historical data updates, analytics

### Network-Aware Features
- **Poor Connection**: Reduce image quality, defer non-critical syncs
- **Good Connection**: Preload additional data, sync all pending actions
- **Offline Mode**: Show cached data, queue all actions for later sync

## Testing Strategy

### Offline Functionality Tests
- [ ] Data displays correctly when offline
- [ ] Actions are queued properly when offline
- [ ] Sync works correctly when connection restored
- [ ] Conflict resolution handles data discrepancies
- [ ] Cache size limits prevent storage overflow

### Cross-Device Testing
- [ ] Mobile phones with poor connectivity
- [ ] Tablets with intermittent WiFi
- [ ] Desktop with network throttling
- [ ] Different browsers and storage limitations

### Edge Case Testing
- [ ] App switching during sync operations
- [ ] Browser restart with pending actions
- [ ] Storage full scenarios
- [ ] Corrupted cache data recovery
- [ ] Multiple device sync conflicts

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Create PlayerOfflineContext and CaptainOfflineContext
- Implement basic storage services
- Add offline indicators to layouts

### Phase 2: Core Functionality (Week 2)
- Implement data caching for essential information
- Create action queuing system
- Add background sync capabilities

### Phase 3: Advanced Features (Week 3)
- Implement conflict resolution
- Add smart preloading strategies
- Optimize performance and storage

### Phase 4: Testing & Refinement (Week 4)
- Comprehensive testing across devices
- Performance optimization
- User experience refinements

## Success Criteria

✅ **Players** can view teams, matches, and profile information offline
✅ **Captains** can manage teams and view fixture information offline
✅ **Media uploads** are queued and sync automatically when online
✅ **Profile updates** are preserved and synced without data loss
✅ **Performance** remains smooth with offline capabilities enabled
✅ **Storage usage** stays within reasonable limits (< 50MB per user)
✅ **Sync conflicts** are resolved automatically without user intervention
✅ **Battery usage** is optimized for mobile devices

This comprehensive offline implementation will ensure that players and captains can continue using core functionality even with poor or no internet connectivity, providing a seamless experience that matches the high standards set by the volunteer offline system.