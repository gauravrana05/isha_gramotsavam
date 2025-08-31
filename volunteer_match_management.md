# Volunteer Match Management Migration Guide

## Overview
Migration of match management system from Firebase to PostgreSQL + tRPC + Prisma for volunteer match operations.

## Current Firebase Implementation Analysis

### Firebase Collections Structure
```
matches/
├── matchId (document)
│   ├── fixtureId: string
│   ├── fixtureName: string
│   ├── sportId: string
│   ├── sportName: string
│   ├── genderCategory: string
│   ├── venueId: string
│   ├── venueName: string
│   ├── roundName: string
│   ├── nextMatchId: string | null
│   ├── nextSlot: 'team1Id' | 'team2Id' | null
│   ├── matchNumber: number
│   ├── team1: { teamId, teamName, tournamentNumber }
│   ├── team2: { teamId, teamName, tournamentNumber }
│   ├── status: 'scheduled' | 'ready' | 'in_progress' | 'completed'
│   ├── result: { winnerId, winnerName, resultEnteredAt, score }
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
```

## ✅ Existing Prisma Models Analysis

### **Perfect Match - No Changes Needed:**

#### 1. **Match Model** (Complete)
```prisma
model Match {
  id                     String @id @default(uuid()) @db.Uuid
  fixtureId              String @db.Uuid @map("fixture_id")
  eventId                String? @db.Uuid @map("event_id")
  sportId                String @db.Uuid @map("sport_id")
  venueLevelMappingId    String @db.Uuid @map("venue_level_mapping_id")
  genderCategory         GenderCategory @map("gender_category")
  roundName              String @db.VarChar(100) @map("round_name")
  matchNumber            Int @map("match_number")
  team1Id                String? @db.Uuid @map("team1_id")
  team2Id                String? @db.Uuid @map("team2_id")
  dependsOnMatch1Id      String? @db.Uuid @map("depends_on_match1_id")
  dependsOnMatch2Id      String? @db.Uuid @map("depends_on_match2_id")
  nextMatchId            String? @db.Uuid @map("next_match_id")
  nextSlot               String? @db.VarChar(10) @map("next_slot")
  winnerId               String? @db.Uuid @map("winner_id")
  winnerName             String? @db.VarChar(200) @map("winner_name")
  team1Score             Int? @map("team1_score")
  team2Score             Int? @map("team2_score")
  scoreDetails           String? @map("score_details")
  resultEnteredBy        String? @db.Uuid @map("result_entered_by")
  resultEnteredAt        DateTime? @db.Timestamptz(6) @map("result_entered_at")
  status                 MatchStatus @default(scheduled)
  createdAt              DateTime @default(now()) @db.Timestamptz(6) @map("created_at")
  updatedAt              DateTime @updatedAt @db.Timestamptz(6) @map("updated_at")
  deletedAt              DateTime? @db.Timestamptz(6) @map("deleted_at")

  // Relations - Complete bracket support
  dependsOnMatch1      Match? @relation("DependsOnMatch1", fields: [dependsOnMatch1Id], references: [id])
  otherDependsOnMatch1 Match[] @relation("DependsOnMatch1")
  dependsOnMatch2      Match? @relation("DependsOnMatch2", fields: [dependsOnMatch2Id], references: [id])
  otherDependsOnMatch2 Match[] @relation("DependsOnMatch2")
  nextMatch            Match? @relation("NextMatch", fields: [nextMatchId], references: [id])
  otherNextMatches     Match[] @relation("NextMatch")
  
  fixture              Fixture @relation(fields: [fixtureId], references: [id], onDelete: Cascade)
  sport                Sport @relation(fields: [sportId], references: [id])
  venueLevelMapping    VenueLevelMapping @relation(fields: [venueLevelMappingId], references: [id])
  team1                Team? @relation("MatchTeam1", fields: [team1Id], references: [id])
  team2                Team? @relation("MatchTeam2", fields: [team2Id], references: [id])
  winner               Team? @relation("MatchWinner", fields: [winnerId], references: [id])
  resultEnteredByUser  User? @relation(fields: [resultEnteredBy], references: [id])
}
```

#### 2. **Existing Enums (Perfect)**
```prisma
enum MatchStatus {
  scheduled
  ready
  in_progress
  completed
  cancelled
}

enum GenderCategory {
  men
  women
  mixed
}
```

## 🔧 ONLY 2 Fields Need to be Added to Existing Schema

### **Missing Fields Analysis:**

#### 1. **Match Model - Add 2 fields:**
```sql
-- Add to existing matches table (if missing)
ALTER TABLE matches ADD COLUMN scheduled_time TIMESTAMPTZ(6);
ALTER TABLE matches ADD COLUMN actual_start_time TIMESTAMPTZ(6);
```

### **✅ Everything Else Already Exists:**

1. **Match Management**: ✅ Complete with all bracket dependencies
2. **Team Relations**: ✅ Complete with team1, team2, winner relations
3. **Result Tracking**: ✅ Complete with scores, winner, result entry tracking
4. **Match Dependencies**: ✅ Complete with `dependsOnMatch1Id`, `dependsOnMatch2Id`, `nextMatchId`
5. **All Enums**: ✅ `MatchStatus`, `GenderCategory`
6. **Relations**: ✅ All foreign keys and cascading deletes properly set up

## tRPC Router Implementation

### File: `src/server/api/routers/volunteers/match.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

export const volunteersMatchRouter = createTRPCRouter({
  // Get venue matches
  getVenueMatches: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      fixtureId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      // Check volunteer permissions
      if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Get venue level mappings for this venue
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      const whereClause: any = {
        venueLevelMappingId: { in: venueLevelMappings.map(vlm => vlm.id) }
      };

      if (input.fixtureId) {
        whereClause.fixtureId = input.fixtureId;
      }

      return await ctx.db.match.findMany({
        where: whereClause,
        include: {
          fixture: {
            select: { name: true }
          },
          team1: {
            select: { id: true, name: true, tournamentNumber: true }
          },
          team2: {
            select: { id: true, name: true, tournamentNumber: true }
          },
          winner: {
            select: { id: true, name: true }
          },
          sport: {
            select: { name: true, displayName: true }
          }
        },
        orderBy: [
          { roundName: 'desc' },
          { matchNumber: 'asc' }
        ]
      });
    }),

  // Get match details
  getMatchDetails: protectedProcedure
    .input(z.object({
      matchId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          fixture: {
            select: { name: true }
          },
          team1: {
            select: { id: true, name: true, tournamentNumber: true }
          },
          team2: {
            select: { id: true, name: true, tournamentNumber: true }
          },
          winner: {
            select: { id: true, name: true }
          },
          sport: {
            select: { name: true, displayName: true }
          },
          venueLevelMapping: {
            include: { venue: true }
          }
        }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      return { match };
    }),

  // Start match
  startMatch: protectedProcedure
    .input(z.object({
      matchId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check volunteer permissions
      if (!['technical_volunteer', 'admin'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to start matches' });
      }

      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      if (match.status !== 'ready') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Match is not ready to start' });
      }

      await ctx.db.match.update({
        where: { id: input.matchId },
        data: {
          status: 'in_progress',
          actualStartTime: new Date()
        }
      });

      return { success: true, message: 'Match started successfully' };
    }),

  // Update match result
  updateMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      winnerId: z.string(),
      winnerName: z.string(),
      team1Score: z.number().optional(),
      team2Score: z.number().optional(),
      scoreDetails: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check volunteer permissions
      if (!['technical_volunteer', 'admin'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to update match results' });
      }

      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          fixture: true,
          team1: true,
          team2: true
        }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      if (match.status !== 'ready' && match.status !== 'in_progress') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Match is not ready to be played or already completed' });
      }

      // Validate winner is one of the participating teams
      const validWinners = [match.team1Id, match.team2Id].filter(Boolean);
      if (!validWinners.includes(input.winnerId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Winner must be one of the participating teams' });
      }

      // Update match result in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Update match
        const updatedMatch = await tx.match.update({
          where: { id: input.matchId },
          data: {
            status: 'completed',
            winnerId: input.winnerId,
            winnerName: input.winnerName,
            team1Score: input.team1Score,
            team2Score: input.team2Score,
            scoreDetails: input.scoreDetails,
            resultEnteredBy: ctx.user.id,
            resultEnteredAt: new Date()
          }
        });

        // Advance winner to next match if applicable
        if (match.nextMatchId && match.nextSlot) {
          const updateData: any = {};
          updateData[match.nextSlot] = input.winnerId;
          
          // Check if next match is now ready
          const nextMatch = await tx.match.findUnique({
            where: { id: match.nextMatchId }
          });
          
          if (nextMatch) {
            const willBeReady = (match.nextSlot === 'team1Id' && nextMatch.team2Id) ||
                              (match.nextSlot === 'team2Id' && nextMatch.team1Id);
            
            if (willBeReady) {
              updateData.status = 'ready';
            }
          }

          await tx.match.update({
            where: { id: match.nextMatchId },
            data: updateData
          });
        }

        // Check if tournament is complete
        await checkTournamentCompletion(tx, match.fixtureId, input.winnerId, input.winnerName);

        return updatedMatch;
      });

      return { success: true, message: 'Match result updated successfully' };
    }),

  // Get today's matches
  getTodayMatches: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get venue level mappings
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      return await ctx.db.match.findMany({
        where: {
          venueLevelMappingId: { in: venueLevelMappings.map(vlm => vlm.id) },
          OR: [
            {
              scheduledTime: {
                gte: startDate,
                lt: endDate
              }
            },
            {
              actualStartTime: {
                gte: startDate,
                lt: endDate
              }
            },
            {
              createdAt: {
                gte: startDate,
                lt: endDate
              }
            }
          ]
        },
        include: {
          fixture: {
            select: { name: true }
          },
          team1: { select: { name: true } },
          team2: { select: { name: true } }
        },
        orderBy: [
          { scheduledTime: 'asc' },
          { actualStartTime: 'asc' },
          { createdAt: 'asc' }
        ]
      });
    })
});

// Helper function to check tournament completion
async function checkTournamentCompletion(
  tx: any,
  fixtureId: string,
  winnerId: string,
  winnerName: string
) {
  // Get all matches for this fixture
  const allMatches = await tx.match.findMany({
    where: { fixtureId },
    include: { fixture: true }
  });

  const fixture = allMatches[0]?.fixture;
  if (!fixture) return;

  // Check if this is the final match
  const finalMatch = allMatches.find(m => m.roundName === 'Final');
  const isThisFinalMatch = finalMatch?.id === allMatches.find(m => m.winnerId === winnerId)?.id;

  if (isThisFinalMatch) {
    // Tournament is complete
    const runnerUpId = finalMatch.team1Id === winnerId ? finalMatch.team2Id : finalMatch.team1Id;
    const winners = [winnerId];
    
    if (runnerUpId && (fixture.level === 'cluster' || fixture.level === 'division')) {
      winners.push(runnerUpId);
    }

    await tx.fixture.update({
      where: { id: fixtureId },
      data: {
        status: 'completed',
        championTeamId: winnerId,
        championTeamName: winnerName,
        completedAt: new Date()
      }
    });

    // Trigger level advancement if needed
    await triggerLevelAdvancement(tx, fixture, winners);
  }
}

// Helper function for level advancement
async function triggerLevelAdvancement(tx: any, fixture: any, winners: string[]) {
  if (fixture.level === 'cluster' && winners.length >= 2) {
    // Find division venue mapping
    const mapping = await tx.clusterDivisionMapping.findFirst({
      where: {
        clusterVenueMappingId: fixture.venueLevelMappingId,
        isActive: true
      }
    });

    if (mapping) {
      // Create division venue assignments for winners
      for (const teamId of winners.slice(0, 2)) {
        await tx.teamVenueAssignment.create({
          data: {
            teamId,
            eventId: fixture.eventId,
            divisionVenueMappingId: mapping.divisionVenueMappingId,
            assignmentLevel: 'division',
            status: 'assigned',
            assignedBy: 'system_auto',
            advancedFrom: 'cluster'
          }
        });

        await tx.team.update({
          where: { id: teamId },
          data: {
            currentLevel: 'division',
            clusterQualified: true,
            checkedIn: false,
            tournamentNumber: null,
            matchDayStatus: 'pending'
          }
        });
      }
    }
  } else if (fixture.level === 'division' && winners.length >= 2) {
    // Find finals venue
    const finalsVenue = await tx.venueLevelMapping.findFirst({
      where: {
        level: 'final',
        isActive: true,
        venue: {
          name: 'Isha Yoga Center'
        }
      }
    });

    if (finalsVenue) {
      // Create finals venue assignments for winners
      for (const teamId of winners.slice(0, 2)) {
        await tx.teamVenueAssignment.create({
          data: {
            teamId,
            eventId: fixture.eventId,
            finalVenueMappingId: finalsVenue.id,
            assignmentLevel: 'final',
            status: 'assigned',
            assignedBy: 'system_auto',
            advancedFrom: 'division'
          }
        });

        await tx.team.update({
          where: { id: teamId },
          data: {
            currentLevel: 'final',
            divisionQualified: true,
            checkedIn: false,
            tournamentNumber: null,
            matchDayStatus: 'pending'
          }
        });
      }
    }
  }
}
```

## UI Components Migration

### 1. Matches List Page: `/volunteer/venues/[venueId]/matches/page.tsx`

**Key Changes:**
- Replace Firebase server actions with tRPC hooks
- Update data structure handling
- Maintain existing UI/UX

```typescript
// Replace Firebase imports
import { api } from '@/server/trpc/react';

// Replace data fetching
const { data: matches, isLoading, refetch } = api.volunteers.match.getVenueMatches.useQuery(
  { venueId, fixtureId },
  { enabled: !!user && !!venueId }
);

const { data: todayMatches } = api.volunteers.match.getTodayMatches.useQuery(
  { venueId, date: selectedDate },
  { enabled: !!user && !!venueId }
);
```

### 2. Match Details Page: `/volunteer/venues/[venueId]/matches/[matchId]/page.tsx`

**Key Changes:**
- Replace server actions with tRPC mutations
- Update match result handling
- Maintain match progression UI

```typescript
const { data: matchData } = api.volunteers.match.getMatchDetails.useQuery(
  { matchId },
  { enabled: !!matchId }
);

const startMatchMutation = api.volunteers.match.startMatch.useMutation({
  onSuccess: () => {
    refetch();
    showSuccess('Match started successfully!');
  }
});

const updateResultMutation = api.volunteers.match.updateMatchResult.useMutation({
  onSuccess: () => {
    refetch();
    showSuccess('Match result updated successfully!');
  }
});
```

## Database Migration Steps

### 1. Create Migration Files
```sql
-- Add missing fields to matches table (if not already present)
ALTER TABLE matches ADD COLUMN scheduled_time TIMESTAMPTZ(6);
ALTER TABLE matches ADD COLUMN actual_start_time TIMESTAMPTZ(6);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_time ON matches(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_matches_actual_start_time ON matches(actual_start_time);
CREATE INDEX IF NOT EXISTS idx_matches_venue_level_mapping_id ON matches(venue_level_mapping_id);
CREATE INDEX IF NOT EXISTS idx_matches_fixture_status ON matches(fixture_id, status);
```

### 2. Data Migration Script
```typescript
// scripts/migrate-matches.ts
import { db } from '@/lib/db';
import { adminDb } from '@/lib/firebase/admin';

async function migrateMatches() {
  const matchesSnapshot = await adminDb.collection('matches').get();
  
  for (const doc of matchesSnapshot.docs) {
    const data = doc.data();
    
    // Find corresponding venue level mapping
    const venueLevelMapping = await db.venueLevelMapping.findFirst({
      where: { 
        venue: { id: data.venueId },
        level: data.level || 'cluster'
      }
    });

    if (!venueLevelMapping) continue;

    await db.match.create({
      data: {
        id: doc.id,
        fixtureId: data.fixtureId,
        eventId: data.eventId,
        sportId: data.sportId,
        venueLevelMappingId: venueLevelMapping.id,
        genderCategory: data.genderCategory,
        roundName: data.roundName,
        matchNumber: data.matchNumber,
        team1Id: data.team1?.teamId,
        team2Id: data.team2?.teamId,
        nextMatchId: data.nextMatchId,
        nextSlot: data.nextSlot,
        winnerId: data.result?.winnerId,
        winnerName: data.result?.winnerName,
        team1Score: data.result?.score?.team1Score,
        team2Score: data.result?.score?.team2Score,
        scoreDetails: data.result?.score?.details,
        resultEnteredBy: data.result?.resultEnteredBy,
        resultEnteredAt: data.result?.resultEnteredAt?.toDate(),
        status: data.status,
        scheduledTime: data.scheduledTime?.toDate(),
        actualStartTime: data.actualStartTime?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      }
    });
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Test tRPC procedures
- Test match result logic
- Test tournament completion detection

### 2. Integration Tests
- Test complete match workflow
- Test bracket advancement
- Test level advancement triggers

### 3. E2E Tests
- Test volunteer match management workflow
- Test UI interactions
- Test real-time match updates

## Performance Considerations

### 1. Database Optimization
- Proper indexing on match queries
- Efficient bracket traversal queries
- Connection pooling for concurrent match updates

### 2. Caching Strategy
- Cache match lists per venue
- Cache tournament brackets
- Invalidate cache on match updates

### 3. Real-time Updates
- WebSocket integration for live match updates
- Optimistic updates for better UX

## Security Considerations

### 1. Authorization
- Verify volunteer permissions for match operations
- Validate match ownership before modifications
- Implement role-based access control

### 2. Data Validation
- Validate match results
- Ensure winner is participating team
- Validate bracket progression integrity

## Migration Timeline

### Phase 1: Database Setup
- Add missing fields to matches table
- Set up tRPC match router
- Create migration scripts

### Phase 2: Backend Migration
- Implement tRPC procedures
- Migrate match result logic
- Add comprehensive testing

### Phase 3: Frontend Migration
- Update UI components
- Replace Firebase calls with tRPC
- Test volunteer workflows

### Phase 4: Data Migration
- Migrate existing match data
- Validate data integrity
- Performance testing

### Phase 5: Deployment
- Deploy to staging
- User acceptance testing
- Production deployment with rollback plan

## Success Metrics

1. **Performance**: Match updates < 1s
2. **Reliability**: 99.9% uptime during tournaments
3. **Data Integrity**: Zero data loss during migration
4. **User Experience**: No workflow disruption for volunteers
5. **Scalability**: Support for 1000+ concurrent matches

This migration will provide a more robust, scalable, and maintainable match management system while preserving all existing functionality and improving performance.
