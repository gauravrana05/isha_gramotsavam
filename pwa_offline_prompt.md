# PWA & Offline Implementation Prompt for Isha Gramotsavam Volunteer System

## Project Overview
Implement offline-first functionality for volunteers managing match-day operations. Focus on simplicity and reliability with a 30MB Redis cache limit. Priority: **Volunteer must work seamlessly offline**.

## Core Requirements

### 1. PWA Setup (Simple & Effective)
- **Update next.config.ts**: Add next-pwa configuration for production only
- **Enhance manifest.json**: Add volunteer-specific shortcuts (Teams, Matches, Dashboard)
- **Service Worker**: Configure caching strategies:
  - Static assets: CacheFirst
  - API calls: NetworkFirst with offline fallback
  - Volunteer pages: StaleWhileRevalidate
- **Offline fallback page**: Show cached data summary and sync status

### 2. Redis Caching Strategy (30MB Total)
**Cache Priority Distribution:**
- **Critical (15MB)**: Venue stats, team summaries, today's fixtures
- **High (8MB)**: Search results, player data, match schedules  
- **Medium (5MB)**: User sessions, dashboard data
- **Low (2MB)**: Configuration, system settings

**Key Cache Patterns:**
- `venue:{venueId}:stats` - Team counts, match status (TTL: 5min)
- `venue:{venueId}:teams:summary` - Team list with basic info (TTL: 15min)
- `venue:{venueId}:fixtures:{date}` - Today's matches (TTL: 30min)
- `search:teams:{venueId}:{query}` - Search results (TTL: 10min)
- `session:{userId}` - User session data (TTL: 30min)

**Cache Invalidation:**
- Team status changes → Clear venue stats + team summaries
- Match updates → Clear fixture cache + live data
- Player verification → Clear team summaries + search cache

### 3. IndexedDB Offline Storage (50MB per volunteer)
**Store Structure:**
- **teams**: Team rosters with player details
- **players**: Player verification data and documents
- **matches**: Match events and scores
- **mediaQueue**: Pending media uploads with metadata
- **syncQueue**: Offline actions waiting for sync
- **volunteerActions**: Check-ins, verifications, score updates

**Data Preloading on Login:**
1. Volunteer's venue assignment
2. All teams for assigned venue
3. Today's fixture schedule
4. Sports configuration and rules
5. Initialize empty sync queue

### 4. Offline Action Queue System
**Critical Actions (High Priority Sync):**
- Team check-ins
- Player verification status changes
- Match score updates
- Critical system events

**Media Actions (Background Sync):**
- Photo/video uploads
- Document attachments
- Media metadata updates

**Queue Management:**
- Store actions in IndexedDB with timestamps
- Retry failed syncs with exponential backoff
- Conflict resolution: Last-write-wins for simple data, manual for scores
- Batch sync when online for efficiency

### 5. Background Sync Implementation
**Sync Triggers:**
- Network connectivity restored
- App becomes active/foreground
- Manual sync button
- Periodic background sync (if supported)

**Sync Process:**
1. Check network connectivity
2. Process high-priority actions first
3. Upload media files in background
4. Update local cache with server responses
5. Show sync progress to user
6. Handle conflicts gracefully

### 6. Volunteer Workflow Optimization
**Pre-Match (Online):**
- Download venue assignment
- Cache team rosters and player data
- Preload today's fixtures and rules
- Verify all critical data is cached

**During Match (Offline-First):**
- Team check-ins work offline
- Player verification updates queue locally
- Match scoring continues without network
- Media capture queues for later upload
- Real-time UI updates from local data

**Post-Match (Background Sync):**
- Sync all actions when network available
- Upload captured media
- Update server with match results
- Resolve any data conflicts

### 7. User Experience Enhancements
**Network Status Indicators:**
- Clear online/offline status in header
- Sync progress indicators
- Pending actions counter
- Data freshness timestamps

**Offline Capabilities:**
- Full team management without network
- Match scoring and event logging
- Media capture and queuing
- Search through cached data
- View historical match data

**Error Handling:**
- Graceful degradation when offline
- Clear error messages for failed syncs
- Retry mechanisms for failed uploads
- Data recovery options

### 8. Performance Optimizations
**Memory Management:**
- Automatic cleanup of old cached data
- Smart preloading based on volunteer schedule
- Compress media before upload
- Efficient IndexedDB queries with proper indexes

**Battery Optimization:**
- Reduce background sync frequency when battery low
- Compress images before storing
- Minimize wake locks during sync
- Efficient service worker lifecycle

### 9. Implementation Phases
**Phase 1 (Week 1)**: Basic PWA + Redis caching
**Phase 2 (Week 2)**: IndexedDB storage + offline actions
**Phase 3 (Week 3)**: Background sync + media queue
**Phase 4 (Week 4)**: Conflict resolution + optimization

### 10. Testing Strategy
**Offline Testing:**
- Simulate network failures during critical operations
- Test data consistency after sync
- Verify media upload queue functionality
- Test conflict resolution scenarios

**Performance Testing:**
- Monitor Redis memory usage (stay under 30MB)
- Test IndexedDB performance with large datasets
- Measure app startup time with cached data
- Battery usage during offline operations

## Success Metrics
- Volunteer can complete full match-day workflow offline
- 95% of actions sync successfully when online
- App startup time < 3 seconds with cached data
- Redis memory usage < 25MB average
- Zero data loss during network interruptions

## Key Files to Modify
- `next.config.ts` - PWA configuration
- `public/manifest.json` - App manifest
- `src/lib/services/redis/` - Cache service
- `src/lib/storage/` - IndexedDB enhancement
- `src/context/OfflineContext.tsx` - Offline state management
- `src/components/system/` - Network indicators
- Service worker files for caching strategies

## Critical Success Factors
1. **Simplicity First**: Don't over-engineer, focus on core volunteer needs
2. **Reliability**: Offline actions must never be lost
3. **Performance**: Fast app startup and smooth offline experience
4. **User Feedback**: Clear indicators of sync status and data freshness
5. **Graceful Degradation**: App works progressively better with connectivity
