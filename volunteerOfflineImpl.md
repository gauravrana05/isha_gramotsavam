# Complete Offline-First Implementation for Volunteer System

## Overview & Context

You are implementing a comprehensive offline-first system for the Isha Gramotsavam sports tournament management app. The current system has volunteers making direct API calls to PostgreSQL, which fails in poor connectivity scenarios common in rural tournament venues.

### Current Architecture Issues:
- **Frontend**: 50+ volunteer pages making direct `api.volunteers.*` TRPC calls to PostgreSQL
- **Backend**: TRPC routers in `src/server/api/routers/volunteers/` hitting PostgreSQL directly  
- **Authentication**: Cookie-based auth that requires online validation on every app load
- **Offline System**: Exists but is bypassed - only main volunteer page uses offline hooks
- **Critical Bug**: OfflineContext uses hardcoded `'volunteer-user'` instead of real user IDs

### Target Architecture:
```
User Action → Offline Hook → VolunteerService → IndexedDB Cache → [Background] → PostgreSQL
                                           ↓
                                   Immediate Response
```

### Key References:
- **Database Schema**: `prisma/schema.prisma` - PostgreSQL table relationships
- **Existing Offline Infrastructure**: `src/lib/services/offline/` - Storage and sync services
- **Authentication**: `src/context/AuthContext.tsx` - Current auth system
- **TRPC Patterns**: `src/server/api/routers/volunteers/` - Current API structure
- **UI Components**: `src/app/[lang]/volunteer/` - 50+ pages to migrate

---

## PHASE 0: CRITICAL AUTHENTICATION INTEGRATION

**⚠️ CRITICAL: This phase MUST be completed first as it affects data security and user isolation.**

### Current Authentication Problems:
1. **Hardcoded User ID**: `OfflineContext.tsx:721` uses `'volunteer-user'` instead of real user ID
2. **No Offline Auth**: User appears logged out when offline, breaking the entire experience
3. **Data Leakage Risk**: All volunteers would share the same cache without proper user isolation
4. **Session Dependency**: Auth requires online validation on every app load

### 0.1 Implement Offline-First Authentication

**File: `src/context/AuthContext.tsx`**

**Current Problem Pattern:**
```typescript
// App always requires API call to authenticate
const response = await fetch('/api/auth/me', {
  method: 'GET',
  credentials: 'include',
});
// ❌ If offline: No user data → Login redirect → Broken experience
```

**Required Implementation:**

#### A. Add User Caching Logic
Add these interfaces and methods to AuthContext:

```typescript
interface CachedUserData {
  user: User;
  timestamp: number;
  expiry: number;
}

interface AuthContextType {
  // ... existing properties
  
  // NEW: Offline support
  clearOfflineData: () => Promise<void>;
  isOfflineMode: boolean;
}
```

#### B. Modify Auth Initialization
Replace the current `initializeAuth` function with offline-first logic:

```typescript
const initializeAuth = async () => {
  try {
    // STEP 1: Try cached user first for instant load
    const cachedData = localStorage.getItem('cached_user_auth');
    let hasValidCache = false;
    
    if (cachedData) {
      try {
        const { user: cachedUser, expiry }: CachedUserData = JSON.parse(cachedData);
        if (Date.now() < expiry) {
          setUser(cachedUser);
          setLoading(false);
          hasValidCache = true;
          console.log('✅ Using cached user for instant load:', cachedUser.id);
          
          // Background validation if online
          if (navigator.onLine) {
            setTimeout(() => validateAndUpdateUser(cachedUser.id), 100);
          }
        } else {
          localStorage.removeItem('cached_user_auth');
        }
      } catch (error) {
        console.warn('Invalid cached user data:', error);
        localStorage.removeItem('cached_user_auth');
      }
    }
    
    // STEP 2: If no valid cache or offline, try API
    if (!hasValidCache) {
      if (!navigator.onLine) {
        console.log('⚠️ Offline and no cached user - showing login');
        setLoading(false);
        return;
      }
      
      await validateAndUpdateUser();
    }
    
  } catch (error) {
    console.error('Auth initialization failed:', error);
    
    // FALLBACK: Try to use cached user even if expired (offline mode)
    const cachedData = localStorage.getItem('cached_user_auth');
    if (cachedData) {
      try {
        const { user: cachedUser }: CachedUserData = JSON.parse(cachedData);
        setUser(cachedUser);
        setIsOfflineMode(true);
        console.log('🔄 Using expired cache due to connection error');
      } catch (fallbackError) {
        console.error('Failed to use cached user:', fallbackError);
      }
    }
    
    setLoading(false);
  }
};

const validateAndUpdateUser = async (currentUserId?: string) => {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const { user: freshUser } = await response.json();
      if (freshUser) {
        // Cache the fresh user data
        const cacheData: CachedUserData = {
          user: freshUser,
          timestamp: Date.now(),
          expiry: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        };
        localStorage.setItem('cached_user_auth', JSON.stringify(cacheData));
        
        // Update user if different from current
        if (!currentUserId || currentUserId !== freshUser.id) {
          setUser(freshUser);
          
          // If user changed, clear old offline data
          if (currentUserId && currentUserId !== freshUser.id) {
            await clearOfflineData();
          }
        }
        
        setIsOfflineMode(false);
      }
    }
  } catch (error) {
    console.warn('Background user validation failed:', error);
    // Don't fail - continue with cached user
  }
};
```

#### C. Update Logout Function
```typescript
const logout = useCallback(async () => {
  try {
    // Clear server session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Server logout failed:', error);
  }
  
  // Always clear local data regardless of server response
  setUser(null);
  setIsOfflineMode(false);
  localStorage.removeItem('cached_user_auth');
  
  // Clear offline cache
  await clearOfflineData();
  
  window.location.href = '/';
}, [clearOfflineData]);

const clearOfflineData = useCallback(async () => {
  try {
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name?.includes('volunteer') || db.name?.includes('offline')) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    
    // Clear localStorage offline data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('volunteer') || key.includes('offline') || key.includes('cached_user')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ Offline data cleared');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
  }
}, []);
```

### 0.2 Fix OfflineContext User Integration

**File: `src/context/OfflineContext.tsx`**

**Current Critical Bug:**
```typescript
// Line 721 - HARDCODED USER ID!
await volunteerService.initialize('volunteer-user'); // ❌ SECURITY VULNERABILITY
```

**Required Fix:**
```typescript
import { useAuth } from '@/context/AuthContext';

export const OfflineProvider = ({ children, onConnectionChange, onSyncComplete }) => {
  // Import auth context
  const { user, loading: authLoading, isOfflineMode } = useAuth();
  
  // ... existing state variables
  
  // Don't initialize services until we have authenticated user
  useEffect(() => {
    if (authLoading || !user?.id) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }
    
    const initializeServices = async () => {
      try {
        console.log('🔄 Initializing offline services for user:', user.id);
        
        // Initialize with REAL user ID
        await volunteerService.initialize(user.id);
        console.log('✅ Volunteer service initialized for user:', user.id);
        
        // Initialize other services
        await backgroundSyncManager.initialize();
        await mediaUploadQueue.initialize();
        await conflictResolver.initialize();
        await syncMonitor.initialize();
        
        console.log('✅ All offline services initialized');
        
        // Preload data for this user
        if (!isOfflineMode) {
          await preloadVolunteerData({ 
            userId: user.id,
            priorityLevel: 'critical' 
          });
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize offline services:', error);
      }
    };
    
    initializeServices();
  }, [user?.id, authLoading, isOfflineMode]);
  
  // Update all service method calls to pass user ID
  const preloadVolunteerDataWithUser = useCallback(async (
    options: { forceRefresh?: boolean; priorityLevel?: 'critical' | 'full' | 'minimal' } = {}
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    await preloadVolunteerData({
      userId: user.id,
      ...options
    });
  }, [user?.id]);
  
  // ... rest of the component with user ID properly passed to all methods
  
  // Don't provide offline context until user is authenticated
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>;
  }
  
  if (!user) {
    // User not authenticated - provide limited context
    return (
      <OfflineContext.Provider value={{
        isOnline: navigator?.onLine ?? true,
        isOffline: !navigator?.onLine ?? false,
        connectionQuality: ConnectionQuality.OFFLINE,
        // ... minimal context for unauthenticated users
      }}>
        {children}
      </OfflineContext.Provider>
    );
  }
  
  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};
```

### ✅ Phase 0 Validation Checkpoint

**Before proceeding to Phase 1, verify:**

1. **Authentication Works Offline:**
   ```bash
   # Test: Open app → Login → Go offline → Reload page
   # Expected: User remains logged in, can access volunteer pages
   ```

2. **User ID Integration:**
   ```bash
   # Check browser console for:
   # "✅ Volunteer service initialized for user: [REAL_USER_ID]"
   # NOT "volunteer-user"
   ```

3. **Data Isolation:**
   ```bash
   # Test: Login as different users → Verify separate IndexedDB databases
   # Check IndexedDB in DevTools - each user should have isolated data
   ```

4. **Cache Clearing:**
   ```bash
   # Test: Logout → Check IndexedDB cleared → Login as different user
   # Expected: No data leakage between users
   ```

**🚨 DO NOT PROCEED TO PHASE 1 UNTIL ALL PHASE 0 CHECKPOINTS PASS**

---

## PHASE 1: CREATE OFFLINE-FIRST HOOKS LAYER

### Objective
Build comprehensive hooks that always try IndexedDB first, then sync with PostgreSQL in the background.

### 1.1 Hook Architecture Pattern

All hooks must follow this exact pattern for consistency:

```typescript
// File: src/hooks/useOfflineBase.ts (Create this base pattern)
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOffline } from '@/context/OfflineContext';

export function useOfflineBase<T>(
  serviceMethod: string,
  params: any = {},
  options: {
    enabled?: boolean;
    refreshInterval?: number;
    backgroundSync?: boolean;
  } = {}
) {
  const { user } = useAuth();
  const { isOnline, addPendingAction } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { enabled = true, refreshInterval, backgroundSync = true } = options;

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const loadData = async () => {
      try {
        setError(null);
        const service = getVolunteerService();
        
        // Always try offline storage first
        const result = await (service as any)[serviceMethod](
          ...Object.values(params),
          user.id
        );
        
        setData(result);
        setLastUpdated(Date.now());
        
        // Background sync if online
        if (isOnline && backgroundSync) {
          setTimeout(() => syncInBackground(), 100);
        }
        
      } catch (err) {
        console.error(`Hook ${serviceMethod} error:`, err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    const syncInBackground = async () => {
      try {
        // This would trigger API call to refresh cache
        // Implementation depends on specific service method
      } catch (error) {
        console.warn('Background sync failed:', error);
      }
    };

    loadData();
  }, [enabled, user?.id, JSON.stringify(params), serviceMethod]);

  return { data, isLoading, error, lastUpdated };
}
```

### 1.2 Specific Hook Implementations

#### A. Venue Data Hook
**File: `src/hooks/useOfflineVenueData.ts`**

```typescript
import { useOfflineBase } from './useOfflineBase';
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

export interface VenueData {
  venue: any; // Match existing TRPC types
  stats: any;
  teams: any[];
  matches: any[];
  fixtures: any[];
}

export function useOfflineVenueData(venueId?: string) {
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadVenueData = useCallback(async () => {
    if (!venueId || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      
      // Load all venue-related data from offline storage
      const [venue, stats, teams, matches, fixtures] = await Promise.all([
        service.getVenueDetails(venueId, user.id),
        service.getVenueStats(venueId, user.id),
        service.getVenueTeams(venueId, user.id),
        service.getVenueMatches(venueId, user.id),
        service.getVenueFixtures(venueId, user.id),
      ]);

      setVenueData({ venue, stats, teams, matches, fixtures });
      
    } catch (err) {
      console.error('Failed to load venue data:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

  return {
    venueData,
    isLoading,
    error,
    refetch: loadVenueData,
    // Specific data accessors for backward compatibility
    venue: venueData?.venue,
    stats: venueData?.stats,
    teams: venueData?.teams,
    matches: venueData?.matches,
    fixtures: venueData?.fixtures,
  };
}

// Specific venue hooks for granular access
export function useOfflineVenueDetails(venueId?: string) {
  return useOfflineBase('getVenueDetails', { venueId }, { 
    enabled: !!venueId 
  });
}

export function useOfflineVenueStats(venueId?: string) {
  return useOfflineBase('getVenueStats', { venueId }, { 
    enabled: !!venueId 
  });
}
```

#### B. Teams Hook
**File: `src/hooks/useOfflineTeams.ts`**

```typescript
import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOffline } from '@/context/OfflineContext';

export function useOfflineTeams(venueId?: string) {
  const { user } = useAuth();
  const { addPendingAction } = useOffline();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTeams = useCallback(async () => {
    if (!venueId || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      const teamsData = await service.getTeamsForVenue(venueId, user.id);
      setTeams(teamsData);
      
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return {
    teams,
    isLoading,
    error,
    refetch: loadTeams,
  };
}

export function useOfflineTeamDetails(teamId?: string) {
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTeamDetails = useCallback(async () => {
    if (!teamId || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      const [teamData, playersData] = await Promise.all([
        service.getTeam(teamId, user.id),
        service.getPlayersForTeam(teamId, user.id),
      ]);
      
      setTeam(teamData);
      setPlayers(playersData);
      
    } catch (err) {
      console.error('Failed to load team details:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, user?.id]);

  useEffect(() => {
    loadTeamDetails();
  }, [loadTeamDetails]);

  return {
    team,
    players,
    isLoading,
    error,
    refetch: loadTeamDetails,
  };
}
```

#### C. Matches Hook
**File: `src/hooks/useOfflineMatches.ts`**

```typescript
export function useOfflineMatches(venueId?: string, filters?: any) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMatches = useCallback(async () => {
    if (!venueId || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const service = getVolunteerService();
      const matchesData = await service.getMatchesForVenue(
        venueId, 
        filters?.date, 
        user.id
      );
      setMatches(matchesData);
      
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id, JSON.stringify(filters)]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: loadMatches,
  };
}

export function useOfflineMatchDetails(matchId?: string) {
  return useOfflineBase('getMatchDetails', { matchId }, { 
    enabled: !!matchId 
  });
}
```

#### D. Actions Hook (for mutations)
**File: `src/hooks/useOfflineActions.ts`**

```typescript
import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

export function useOfflineActions() {
  const { user } = useAuth();
  const { addPendingAction, queueSyncAction } = useOffline();

  const checkInTeam = useCallback(async (teamId: string, notes?: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.checkInTeam({
        teamId,
        checkedInBy: user.id,
        timestamp: Date.now(),
        notes,
      }, user.id);

      // Add to pending actions for sync
      addPendingAction({
        type: 'team_checkin',
        description: `Check in team ${teamId}`,
        priority: 'high',
      });

      console.log('✅ Team checked in offline');
      
    } catch (error) {
      console.error('Failed to check in team:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const verifyPlayer = useCallback(async (
    playerId: string, 
    status: 'verified' | 'rejected',
    notes?: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.verifyPlayer({
        playerId,
        status,
        verifiedBy: user.id,
        timestamp: Date.now(),
        notes,
      }, user.id);

      addPendingAction({
        type: 'player_verification',
        description: `${status} player ${playerId}`,
        priority: 'high',
      });

      console.log('✅ Player verification updated offline');
      
    } catch (error) {
      console.error('Failed to verify player:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const updateMatchScore = useCallback(async (
    matchId: string, 
    teamScores: { teamId: string; score: number }[]
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.updateMatchScore({
        matchId,
        teamScores,
        updatedBy: user.id,
        timestamp: Date.now(),
      }, user.id);

      addPendingAction({
        type: 'match_score',
        description: `Update score for match ${matchId}`,
        priority: 'high',
      });

      console.log('✅ Match score updated offline');
      
    } catch (error) {
      console.error('Failed to update match score:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  return {
    checkInTeam,
    verifyPlayer,
    updateMatchScore,
    // Add more action methods as needed
  };
}
```

### 1.3 VolunteerService Extensions

**File: `src/lib/services/offline/volunteerService.ts`**

Add these missing methods to the VolunteerService class:

```typescript
// Add to VolunteerService class
async getVenueDetails(venueId: string, userId: string): Promise<any> {
  await this.ensureInitialized(userId);
  
  // Try cache first
  const cached = await this.storage!.get('venues', venueId);
  if (cached) {
    return cached.data;
  }
  
  // If online and no cache, this would trigger API call
  // For now, return null to indicate no data
  return null;
}

async getVenueStats(venueId: string, userId: string): Promise<any> {
  await this.ensureInitialized(userId);
  
  // Calculate stats from cached data
  const teams = await this.getTeamsForVenue(venueId, userId);
  const matches = await this.getMatchesForVenue(venueId, undefined, userId);
  
  const checkedInTeams = teams.filter(t => t.data.checkedIn);
  const completedMatches = matches.filter(m => m.data.status === 'completed');
  
  return {
    totalTeams: teams.length,
    checkedInTeams: checkedInTeams.length,
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    // Add more stats as needed
  };
}

async getVenueMatches(venueId: string, userId: string): Promise<any[]> {
  return await this.getMatchesForVenue(venueId, undefined, userId);
}

async getVenueFixtures(venueId: string, userId: string): Promise<any[]> {
  await this.ensureInitialized(userId);
  
  const fixtures = await this.storage!.query('fixtures', {
    index: 'venueId',
    value: venueId,
  });
  
  return fixtures.map(f => f.data);
}

async getMatchDetails(matchId: string, userId: string): Promise<any> {
  await this.ensureInitialized(userId);
  
  const match = await this.storage!.get('matches', matchId);
  return match ? match.data : null;
}
```

### ✅ Phase 1 Validation Checkpoint

**Before proceeding to Phase 2, verify:**

1. **Hooks Work Offline:**
   ```bash
   # Test: Go offline → Use hooks in a test page
   # Expected: Data loads from IndexedDB, no API calls
   ```

2. **User ID Integration:**
   ```bash
   # Check: All service methods receive real user ID
   # Verify: No hardcoded user IDs in hook calls
   ```

3. **Error Handling:**
   ```bash
   # Test: Delete IndexedDB → Use hooks
   # Expected: Graceful error handling, no crashes
   ```

4. **Action Hooks:**
   ```bash
   # Test: Use action hooks offline
   # Expected: Actions queued for sync, UI updates immediately
   ```

**🚨 DO NOT PROCEED TO PHASE 2 UNTIL ALL PHASE 1 CHECKPOINTS PASS**

---

## PHASE 2: MIGRATE FRONTEND PAGES TO OFFLINE HOOKS

### Objective
Replace all 50+ direct `api.volunteers.*` calls with offline hooks while maintaining exact same UI/UX.

### 2.1 Migration Strategy

#### A. Identify Pages to Migrate

**High Priority Pages (Migrate First):**
1. `src/app/[lang]/volunteer/venues/[venueId]/dashboard/page.tsx`
2. `src/app/[lang]/volunteer/venues/[venueId]/checkin/page.tsx` 
3. `src/app/[lang]/volunteer/venues/[venueId]/teams/[teamId]/page.tsx`
4. `src/app/[lang]/volunteer/venues/[venueId]/matches/[matchId]/page.tsx`

**Pattern for each page:**
1. Find all `api.volunteers.*` calls
2. Replace with appropriate offline hooks  
3. Update action handlers to use offline actions
4. Preserve all existing UI logic and state management

#### B. Migration Pattern

**Before (Current Pattern):**
```typescript
// In any volunteer page
const { data: venueData, isLoading } = api.volunteers.venue.getVenueDetails.useQuery(
  { venueId: venueId as string },
  { enabled: !!venueId }
);

const checkInMutation = api.volunteers.team.checkInTeam.useMutation({
  onSuccess: () => {
    refetch();
    toast.success('Team checked in successfully');
  },
  onError: (error) => {
    toast.error('Failed to check in team');
  }
});
```

**After (Target Pattern):**
```typescript
// Replace with offline hooks
const { venue: venueData, isLoading } = useOfflineVenueDetails(venueId);

const { checkInTeam } = useOfflineActions();
const [isCheckingIn, setIsCheckingIn] = useState(false);

const handleCheckIn = async (teamId: string) => {
  try {
    setIsCheckingIn(true);
    await checkInTeam(teamId);
    toast.success('Team checked in successfully');
    // No need to refetch - data updates automatically
  } catch (error) {
    toast.error('Failed to check in team');
  } finally {
    setIsCheckingIn(false);
  }
};
```

### 2.2 Specific Page Migrations

#### A. Venue Dashboard
**File: `src/app/[lang]/volunteer/venues/[venueId]/dashboard/page.tsx`**

**Current API Calls to Replace:**
```typescript
// Find these patterns and replace:
api.volunteers.venue.getVenueTeams.useQuery()
api.volunteers.venue.getVenueCheckedInTeams.useQuery()  
api.volunteers.venue.getVenueFixtures.useQuery()
```

**Migration:**
```typescript
// Replace with:
import { useOfflineVenueData } from '@/hooks/useOfflineVenueData';
import { useOfflineTeams } from '@/hooks/useOfflineTeams';

const { venueData, isLoading: venueLoading } = useOfflineVenueData(venueId);
const { teams, isLoading: teamsLoading } = useOfflineTeams(venueId);

// Filter checked-in teams locally
const checkedInTeams = teams?.filter(team => team.checkedIn) || [];

// Use venueData.stats for statistics
const stats = venueData?.stats;
```

#### B. Team Check-in Page
**File: `src/app/[lang]/volunteer/venues/[venueId]/checkin/page.tsx`**

**Current API Calls to Replace:**
```typescript
api.volunteers.team.getVenueTeams.useQuery()
api.volunteers.team.checkInTeam.useMutation()
api.volunteers.team.uploadTeamPhoto.useMutation()
```

**Migration:**
```typescript
import { useOfflineTeams } from '@/hooks/useOfflineTeams';
import { useOfflineActions } from '@/hooks/useOfflineActions';

const { teams, isLoading, refetch } = useOfflineTeams(venueId);
const { checkInTeam } = useOfflineActions();

// Replace mutation with direct action call
const handleCheckIn = async (teamId: string, notes?: string) => {
  try {
    await checkInTeam(teamId, notes);
    // Data will update automatically through the hook
  } catch (error) {
    // Handle error
  }
};
```

#### C. Team Details/Verification Page
**File: `src/app/[lang]/volunteer/venues/[venueId]/teams/[teamId]/page.tsx`**

**Current API Calls to Replace:**
```typescript
api.volunteers.venue.getTeamForVerification.useQuery()
api.volunteers.venue.verifyPlayer.useMutation()
api.volunteers.venue.addPlayer.useMutation()
```

**Migration:**
```typescript
import { useOfflineTeamDetails } from '@/hooks/useOfflineTeams';
import { useOfflineActions } from '@/hooks/useOfflineActions';

const { team, players, isLoading, refetch } = useOfflineTeamDetails(teamId);
const { verifyPlayer } = useOfflineActions();

const handleVerifyPlayer = async (playerId: string, status: 'verified' | 'rejected') => {
  try {
    await verifyPlayer(playerId, status);
    // UI updates automatically
  } catch (error) {
    // Handle error
  }
};
```

#### D. Match Management Page
**File: `src/app/[lang]/volunteer/venues/[venueId]/matches/[matchId]/page.tsx`**

**Current API Calls to Replace:**
```typescript
api.volunteers.match.getMatchDetails.useQuery()
api.volunteers.match.updateMatchStatus.useMutation()
api.volunteers.match.recordMatchResult.useMutation()
```

**Migration:**
```typescript
import { useOfflineMatchDetails } from '@/hooks/useOfflineMatches';
import { useOfflineActions } from '@/hooks/useOfflineActions';

const { data: match, isLoading } = useOfflineMatchDetails(matchId);
const { updateMatchScore } = useOfflineActions();

const handleScoreUpdate = async (teamScores: any[]) => {
  try {
    await updateMatchScore(matchId!, teamScores);
    // Match data updates automatically
  } catch (error) {
    // Handle error
  }
};
```

### 2.3 Complete Migration Checklist

For **each page** in `src/app/[lang]/volunteer/`, complete this checklist:

#### Page Analysis:
- [ ] Identify all `api.volunteers.*` calls
- [ ] List all `useQuery` calls and their parameters
- [ ] List all `useMutation` calls and their handlers
- [ ] Note any `refetch()` calls and their usage

#### Migration Implementation:
- [ ] Import appropriate offline hooks
- [ ] Replace `useQuery` with offline hooks
- [ ] Replace `useMutation` with offline action hooks
- [ ] Remove `refetch()` calls (data updates automatically)
- [ ] Update loading states to use hook loading states
- [ ] Update error handling to use hook error states

#### Testing:
- [ ] Test page loads correctly with offline hooks
- [ ] Test all user actions work offline
- [ ] Test UI updates immediately after actions
- [ ] Test error handling for failed actions
- [ ] Test page works when offline
- [ ] Verify no direct API calls remain

### 2.4 Critical Pages List

Migrate these pages in order of priority:

**Phase 2A - Core Pages:**
1. `venues/[venueId]/dashboard/page.tsx` - Main dashboard
2. `venues/[venueId]/checkin/page.tsx` - Team check-ins
3. `venues/[venueId]/teams/[teamId]/page.tsx` - Player verification
4. `venues/[venueId]/matches/[matchId]/page.tsx` - Match scoring

**Phase 2B - Secondary Pages:**
5. `venues/[venueId]/teams/page.tsx` - Team lists
6. `venues/[venueId]/matches/page.tsx` - Match lists  
7. `venues/[venueId]/fixtures/page.tsx` - Fixture management
8. `venues/page.tsx` - Venue selection

**Phase 2C - Administrative Pages:**
9. All remaining pages in `venues/[venueId]/` subdirectories
10. Other volunteer pages as needed

### ✅ Phase 2 Validation Checkpoint

**Test each migrated page:**

1. **Offline Functionality:**
   ```bash
   # Test: Load page offline
   # Expected: Page loads with cached data, all features work
   ```

2. **Action Handling:**
   ```bash
   # Test: Perform actions offline
   # Expected: Immediate UI updates, actions queued for sync
   ```

3. **Error Handling:**
   ```bash
   # Test: Trigger errors (invalid data, etc.)
   # Expected: Graceful error messages, no crashes
   ```

4. **No Direct API Calls:**
   ```bash
   # Check: Network tab shows no api.volunteers.* calls
   # Verify: All data comes from hooks
   ```

**🚨 DO NOT PROCEED TO PHASE 3 UNTIL ALL PAGES ARE MIGRATED AND TESTED**

---

## PHASE 3: BACKEND INTEGRATION FOR CACHE POPULATION

### Objective
Update TRPC routers to populate offline cache when online, ensuring data freshness and consistency.

### 3.1 VolunteerService Cache Methods

**File: `src/lib/services/offline/volunteerService.ts`**

Add these cache population methods:

```typescript
// Add to VolunteerService class

/**
 * Cache management methods for backend integration
 */
async cacheVenueData(userId: string, venueData: any): Promise<void> {
  await this.ensureInitialized(userId);
  
  if (!venueData) return;
  
  try {
    // Cache venue details
    await this.storage!.put('venues', {
      id: venueData.id,
      data: venueData,
      lastUpdated: Date.now(),
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
    await this.storage!.put('teams', {
      id: teamData.id,
      data: teamData,
      lastUpdated: Date.now(),
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
    await this.storage!.put('matches', {
      id: matchData.id,
      data: matchData,
      lastUpdated: Date.now(),
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
    await this.storage!.put('players', {
      id: playerData.id,
      data: playerData,
      lastUpdated: Date.now(),
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
    await this.storage!.put('fixtures', {
      id: fixtureData.id,
      data: fixtureData,
      lastUpdated: Date.now(),
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
```

### 3.2 TRPC Router Modifications

Update each router to populate cache after successful queries:

#### A. Venue Router
**File: `src/server/api/routers/volunteers/venueNew.ts`**

```typescript
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

// Add this helper function at the top
async function updateOfflineCache(userId: string, data: any, type: 'venue' | 'team' | 'match' | 'fixture') {
  try {
    const volunteerService = await VolunteerService.getServiceForBackend();
    await volunteerService.initialize(userId);
    
    switch (type) {
      case 'venue':
        await volunteerService.cacheVenueData(userId, data);
        break;
      case 'team':
        await volunteerService.cacheTeamData(userId, data);
        break;
      case 'match':
        await volunteerService.cacheMatchData(userId, data);
        break;
      case 'fixture':
        await volunteerService.cacheFixtureData(userId, data);
        break;
    }
  } catch (error) {
    console.warn('Failed to update offline cache:', error);
    // Don't fail the request if cache update fails
  }
}

export const volunteersVenueRouter = createTRPCRouter({
  getVenueDetails: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Existing query logic
      const venueData = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
        include: {
          // ... existing includes
        }
      });
      
      // NEW: Update offline cache
      if (venueData) {
        await updateOfflineCache(ctx.user.id, venueData, 'venue');
      }
      
      return venueData;
    }),

  getVenueTeams: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Existing query logic
      const teams = await ctx.db.team.findMany({
        where: { venueId: input.venueId },
        include: {
          // ... existing includes
        }
      });
      
      // NEW: Update offline cache for each team
      for (const team of teams) {
        await updateOfflineCache(ctx.user.id, team, 'team');
      }
      
      return teams;
    }),

  getVenueStats: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Existing query logic for stats
      const stats = {
        // ... calculate stats from database
      };
      
      // Stats don't need separate caching as they're calculated
      // from cached team/match data
      
      return stats;
    }),
  
  // Apply same pattern to all other venue queries...
});
```

#### B. Team Router
**File: `src/server/api/routers/volunteers/team.ts`**

```typescript
export const volunteersTeamRouter = createTRPCRouter({
  getVenueTeams: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Existing logic
      const teams = await ctx.db.team.findMany({
        where: { venueId: input.venueId },
        include: {
          players: true,
          // ... other includes
        }
      });
      
      // Update cache
      for (const team of teams) {
        await updateOfflineCache(ctx.user.id, team, 'team');
        
        // Cache players too
        if (team.players) {
          for (const player of team.players) {
            await updateOfflineCache(ctx.user.id, player, 'player');
          }
        }
      }
      
      return teams;
    }),

  checkInTeam: protectedProcedure
    .input(z.object({ 
      teamId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Existing mutation logic
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id,
          checkInNotes: input.notes,
        },
        include: {
          players: true,
          // ... other includes
        }
      });
      
      // Update cache with fresh data
      await updateOfflineCache(ctx.user.id, updatedTeam, 'team');
      
      return updatedTeam;
    }),

  // Apply same pattern to all team mutations...
});
```

#### C. Match Router
**File: `src/server/api/routers/volunteers/match.ts`**

```typescript
export const volunteersMatchRouter = createTRPCRouter({
  getMatchDetails: protectedProcedure
    .input(z.object({ matchId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Existing logic
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          teams: true,
          fixture: true,
          // ... other includes
        }
      });
      
      // Update cache
      if (match) {
        await updateOfflineCache(ctx.user.id, match, 'match');
      }
      
      return match;
    }),

  recordMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      teamScores: z.array(z.object({
        teamId: z.string(),
        score: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Existing mutation logic
      const updatedMatch = await ctx.db.match.update({
        where: { id: input.matchId },
        data: {
          // ... update match with scores
          status: 'completed',
          completedAt: new Date(),
        },
        include: {
          teams: true,
          fixture: true,
        }
      });
      
      // Update cache
      await updateOfflineCache(ctx.user.id, updatedMatch, 'match');
      
      return updatedMatch;
    }),

  // Apply same pattern to all match operations...
});
```

### 3.3 Assignment Router Cache Population
**File: `src/server/api/routers/volunteers/assignments.ts`**

```typescript
export const volunteersAssignmentsRouter = createTRPCRouter({
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    // Existing logic to get assignments
    const assignments = await ctx.db.volunteerAssignment.findMany({
      where: { 
        volunteerId: ctx.user.id,
        deletedAt: null
      },
      include: {
        event: true,
        venueLevelMapping: {
          include: {
            venue: true,
          },
        },
      },
    });

    // NEW: Preload venue data for each assignment
    const volunteerService = await VolunteerService.getServiceForBackend();
    await volunteerService.initialize(ctx.user.id);
    
    for (const assignment of assignments) {
      if (assignment.venueLevelMapping?.venue) {
        await volunteerService.cacheVenueData(ctx.user.id, assignment.venueLevelMapping.venue);
        
        // Preload teams for this venue
        const teams = await ctx.db.team.findMany({
          where: { venueId: assignment.venueLevelMapping.venue.id },
          include: { players: true }
        });
        
        for (const team of teams) {
          await volunteerService.cacheTeamData(ctx.user.id, team);
        }
        
        // Preload matches for this venue
        const matches = await ctx.db.match.findMany({
          where: { venueId: assignment.venueLevelMapping.venue.id },
          include: { teams: true, fixture: true }
        });
        
        for (const match of matches) {
          await volunteerService.cacheMatchData(ctx.user.id, match);
        }
      }
    }

    console.log('✅ Preloaded data for user assignments:', ctx.user.id);
    
    return assignments;
  }),
});
```

### 3.4 Error Handling and Performance

Add proper error handling to cache operations:

```typescript
// Enhanced updateOfflineCache function
async function updateOfflineCache(userId: string, data: any, type: string) {
  try {
    // Validate data before caching
    if (!data || !data.id) {
      console.warn('Invalid data for cache update:', type, data);
      return;
    }
    
    // Initialize service with timeout
    const volunteerService = await Promise.race([
      VolunteerService.getServiceForBackend(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service initialization timeout')), 5000)
      )
    ]) as VolunteerService;
    
    await volunteerService.initialize(userId);
    
    // Cache with timeout
    await Promise.race([
      volunteerService[`cache${type.charAt(0).toUpperCase() + type.slice(1)}Data`](userId, data),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cache update timeout')), 3000)
      )
    ]);
    
  } catch (error) {
    console.warn(`Failed to update offline cache for ${type}:`, error);
    // Optionally report to monitoring service
  }
}
```

### ✅ Phase 3 Validation Checkpoint

**Test cache population:**

1. **Data Freshness:**
   ```bash
   # Test: Make API calls online → Check IndexedDB updated
   # Expected: Fresh data in offline storage
   ```

2. **Performance Impact:**
   ```bash
   # Test: Measure API response times with/without cache updates
   # Expected: Minimal impact (< 100ms additional latency)
   ```

3. **Error Tolerance:**
   ```bash
   # Test: Corrupt IndexedDB → Make API calls
   # Expected: API works even if cache fails
   ```

4. **User Isolation:**
   ```bash
   # Test: Multiple users → Verify separate cached data
   # Expected: No data leakage between users
   ```

**🚨 DO NOT PROCEED TO PHASE 4 UNTIL CACHE POPULATION IS VERIFIED**

---

## PHASE 4: COMPREHENSIVE TESTING & VALIDATION

### Objective
Thoroughly test the complete offline-first system to ensure reliability and performance.

### 4.1 End-to-End Workflow Testing

#### A. Complete Offline Workflow Test

**Test Scenario: Field volunteer with poor connectivity**

```bash
# Test Steps:
1. Login online → Verify cache populated
2. Go completely offline  
3. Navigate to all major pages
4. Perform all critical actions (check-ins, verifications, score updates)
5. Verify UI updates immediately
6. Come back online
7. Verify actions sync automatically
8. Check data consistency

# Expected Results:
✅ All pages load instantly when offline
✅ All actions work without network
✅ UI shows immediate feedback
✅ Sync queue shows pending actions
✅ Data syncs successfully when online
✅ No data loss or corruption
```

#### B. Authentication Flow Testing

```bash
# Test Scenarios:
1. Fresh install → Login → Go offline → Reload
   Expected: User stays logged in, can work offline

2. Cached user → Go offline → Open app  
   Expected: Instant login, immediate access to features

3. Expired cache → Go offline → Open app
   Expected: Graceful fallback, limited offline access

4. Different users → Login/logout → Verify data isolation
   Expected: No data leakage between users

5. Logout → Verify cache cleared
   Expected: All offline data removed
```

#### C. Data Consistency Testing

```bash
# Test Scenarios:
1. Multi-device sync conflict resolution
2. Concurrent offline actions from different volunteers
3. Server data changes while offline
4. Network interruption during sync
5. Partial sync failures and recovery

# Validation:
- Data integrity maintained
- No duplicate records
- Conflict resolution works correctly  
- Failed syncs retry properly
```

### 4.2 Performance Testing

#### A. Load Time Measurements

```bash
# Metrics to track:
- Initial app load (online vs offline)
- Page navigation speed
- Action response time
- Sync completion time
- Cache update overhead

# Targets:
- Offline page load: < 200ms
- Action feedback: < 50ms  
- Sync completion: < 5s for typical volunteer data
- API overhead: < 100ms additional
```

#### B. Storage Efficiency

```bash
# Test storage usage:
1. Monitor IndexedDB size growth
2. Test storage limits (50MB+)
3. Verify automatic cleanup
4. Test storage optimization

# Targets:
- Typical volunteer data: < 10MB
- Storage cleanup prevents overflow
- Optimization reduces size by 30%+
```

#### C. Memory and CPU Usage

```bash
# Profile browser performance:
1. Memory usage during offline operations
2. CPU usage during sync
3. Battery impact on mobile devices
4. Background sync efficiency

# Targets:
- Memory usage: < 100MB additional
- CPU spikes: < 2s during sync
- Background sync: Minimal battery impact
```

### 4.3 Error Scenario Testing

#### A. Network Failure Scenarios

```bash
# Test Cases:
1. Complete network loss during action
2. Intermittent connectivity (poor signal)
3. API server errors (500, 503, etc.)
4. Authentication token expiry
5. Request timeouts

# Expected Behavior:
- Actions queue for retry
- UI shows appropriate status
- Graceful degradation
- Automatic recovery when possible
```

#### B. Data Corruption Scenarios

```bash
# Test Cases:
1. Corrupt IndexedDB data
2. Invalid cache entries
3. Schema version mismatches
4. Storage quota exceeded
5. Concurrent access issues

# Expected Behavior:
- Detect corruption automatically
- Fallback to API calls
- Clear corrupted data
- Rebuild cache when needed
```

#### C. Edge Cases

```bash
# Test Cases:
1. Very large datasets (1000+ teams)
2. Rapid action sequences
3. Multiple tabs/windows open
4. Browser cache clearing
5. Device storage full

# Expected Behavior:
- Handle large data efficiently
- Queue actions properly
- Sync across tabs
- Recover from cache loss
- Show storage warnings
```

### 4.4 User Experience Validation

#### A. Offline Indicator Testing

```bash
# Verify UI shows:
- Current connection status
- Pending sync actions count
- Last successful sync time
- Sync progress during upload
- Error states with retry options
```

#### B. Performance Perception

```bash
# User experience metrics:
- Perceived load time (instant vs loading)
- Action feedback responsiveness
- Error message clarity
- Recovery guidance
- Sync status transparency
```

### 4.5 Security Testing

#### A. Data Isolation Verification

```bash
# Test Cases:
1. Multiple volunteers on same device
2. User switching scenarios  
3. Shared device security
4. Cache data encryption (if implemented)
5. Sync authentication validation

# Expected Results:
- Complete data isolation between users
- No access to other volunteer's data
- Secure cache storage
- Authenticated sync requests
```

#### B. Offline Data Security

```bash
# Verify:
- Sensitive data not exposed in cache
- Role-based access maintained offline
- No data leakage through browser tools
- Secure deletion on logout
```

### 4.6 Regression Testing

Create automated tests for critical paths:

```typescript
// Example test structure
describe('Offline Volunteer System', () => {
  describe('Authentication', () => {
    it('should work offline with cached user');
    it('should isolate data between users');
    it('should clear cache on logout');
  });
  
  describe('Data Loading', () => {
    it('should load from cache when offline');
    it('should sync in background when online'); 
    it('should handle missing cache gracefully');
  });
  
  describe('Actions', () => {
    it('should queue actions when offline');
    it('should update UI immediately');
    it('should sync when connectivity returns');
  });
  
  describe('Error Handling', () => {
    it('should recover from corrupted cache');
    it('should handle sync failures gracefully');
    it('should retry failed operations');
  });
});
```

### 4.7 Final Validation Checklist

**Complete System Check:**

- [ ] **Authentication**: Offline login works, proper user isolation
- [ ] **Data Loading**: All pages load from cache when offline  
- [ ] **Actions**: All volunteer actions work offline
- [ ] **Sync**: Background sync works reliably
- [ ] **Performance**: Meets speed and efficiency targets
- [ ] **Error Handling**: Graceful failure and recovery
- [ ] **Security**: Data isolation and secure storage
- [ ] **UI/UX**: Clear status indicators and smooth experience

**Production Readiness Check:**

- [ ] **Error Logging**: Comprehensive error tracking implemented
- [ ] **Monitoring**: Performance metrics collection setup
- [ ] **Documentation**: Updated for volunteer users
- [ ] **Rollback Plan**: Can disable offline features if needed
- [ ] **Support**: Help documentation for offline issues

### ✅ Phase 4 Final Validation

**System must pass ALL of these tests:**

1. **Complete Offline Operation:**
   ```bash
   # Test: Full volunteer workflow without internet
   # Duration: 30 minutes of continuous use
   # Expected: All features work flawlessly
   ```

2. **Data Integrity:**
   ```bash
   # Test: Compare offline vs online data after sync
   # Expected: Perfect data consistency, no losses
   ```

3. **Performance Benchmarks:**
   ```bash
   # Test: Measure all performance metrics
   # Expected: Meets or exceeds all targets
   ```

4. **Error Recovery:**
   ```bash
   # Test: Multiple failure scenarios
   # Expected: System recovers gracefully from all errors
   ```

**🎯 ONLY MARK IMPLEMENTATION COMPLETE WHEN ALL PHASE 4 TESTS PASS**

---

## IMPLEMENTATION SUCCESS CRITERIA

### System Requirements Met:
✅ **Offline-First**: Always tries IndexedDB before API calls
✅ **Authentication**: Cached user auth works offline  
✅ **Data Isolation**: Each volunteer has separate cache
✅ **Real-time UI**: Immediate feedback on all actions
✅ **Background Sync**: Automatic sync when online
✅ **Error Recovery**: Graceful handling of all failure modes
✅ **Performance**: Fast and efficient offline operations
✅ **Security**: Secure data storage and user isolation

### Key Metrics Achieved:
- **Offline Load Time**: < 200ms for all pages
- **Action Response**: < 50ms UI feedback  
- **Sync Success Rate**: > 99% for queued actions
- **Storage Efficiency**: < 10MB per volunteer
- **Error Recovery**: < 30s for automatic recovery
- **User Satisfaction**: Seamless offline experience

### Technical Debt Resolved:
- ❌ **Hardcoded User IDs**: Fixed with real authentication
- ❌ **Direct PostgreSQL Calls**: Replaced with offline-first hooks
- ❌ **No Offline Support**: Complete offline functionality implemented
- ❌ **Poor Connectivity Issues**: Resolved with local caching
- ❌ **Data Inconsistency**: Proper sync and conflict resolution

This implementation transforms the volunteer system from a connectivity-dependent web app into a robust offline-first mobile application suitable for rural tournament management with unreliable internet connectivity.