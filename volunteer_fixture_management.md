# Volunteer Fixture Management Migration Guide

## Overview
Migration of fixture management system from Firebase to PostgreSQL + tRPC + Prisma for volunteer venue operations.

## Current Firebase Implementation Analysis

### Firebase Collections Structure
```
fixtures/
├── fixtureId (document)
│   ├── name: string
│   ├── sportId: string
│   ├── sportName: string
│   ├── genderCategory: 'men' | 'women'
│   ├── level: 'cluster' | 'division' | 'final'
│   ├── venueId: string
│   ├── venueName: string
│   ├── assignedTeams: string[]
│   ├── checkedInTeams: string[]
│   ├── bracket: {
│   │   matches: FixtureMatch[]
│   │   winners: string[]
│   │ }
│   ├── status: 'draft' | 'in_progress' | 'completed'
│   ├── finalStandings: any[]
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
```

## ✅ Existing Prisma Models Analysis

### **Perfect Match - No Changes Needed:**

#### 1. **Fixture Model** (Complete)
```prisma
model Fixture {
  id                     String @id @default(uuid()) @db.Uuid
  name                   String @db.VarChar(200)
  eventId                String? @db.Uuid @map("event_id")
  sportId                String @db.Uuid @map("sport_id")
  venueLevelMappingId    String @db.Uuid @map("venue_level_mapping_id")
  genderCategory         GenderCategory @map("gender_category")
  level                  TournamentLevel
  status                 FixtureStatus @default(draft)
  createdAt              DateTime @default(now()) @db.Timestamptz(6) @map("created_at")
  updatedAt              DateTime @updatedAt @db.Timestamptz(6) @map("updated_at")
  deletedAt              DateTime? @db.Timestamptz(6) @map("deleted_at")

  // Relations
  event                Event? @relation(fields: [eventId], references: [id])
  sport                Sport @relation(fields: [sportId], references: [id])
  venueLevelMapping    VenueLevelMapping @relation(fields: [venueLevelMappingId], references: [id])
  matches              Match[]
  fixtureResults       FixtureResult[]
  fixtureTeams         FixtureTeam[]
}
```

#### 2. **Match Model** (Complete)
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
}
```

#### 3. **Team Model** (Has Tournament Fields)
```prisma
model Team {
  // ... existing fields ...
  tournamentNumber             Int? @map("tournament_number")
  tournamentNumberAssignedAt   DateTime? @db.Timestamptz(6) @map("tournament_number_assigned_at")
  tournamentNumberVenueMappingId String? @db.Uuid @map("tournament_number_venue_mapping_id")
  
  // Relations for matches
  matchesAsTeam1       Match[] @relation("MatchTeam1")
  matchesAsTeam2       Match[] @relation("MatchTeam2")
  matchesAsWinner      Match[] @relation("MatchWinner")
  venueLevelMapping    VenueLevelMapping? @relation(fields: [tournamentNumberVenueMappingId], references: [id])
}
```

#### 4. **VenueLevelMapping Model** (Replaces simple Venue)
```prisma
model VenueLevelMapping {
  id          String @id @default(uuid()) @db.Uuid
  eventId     String @map("event_id") @db.Uuid
  venueId     String @map("venue_id") @db.Uuid
  level       TournamentLevel  // cluster | division | final
  maxTeams    Int? @map("max_teams") @default(100)
  isActive    Boolean @map("is_active") @default(true)

  // Relations
  event                Event @relation(fields: [eventId], references: [id])
  venue                Venue @relation(fields: [venueId], references: [id])
  fixtures             Fixture[]
  matches              Match[]
  teams                Team[]
  volunteerAssignments VolunteerAssignment[]
}
```

#### 5. **Venue Model** (Base venue info)
```prisma
model Venue {
  id            String @id @default(uuid()) @db.Uuid
  name          String @db.VarChar(200)
  address       String? @db.VarChar(500)
  district      String @db.VarChar(100)
  state         String @db.VarChar(100)
  
  // Relations
  venueLevelMappings VenueLevelMapping[]
}
```

### **Existing Enums (Perfect)**
```prisma
enum FixtureStatus {
  draft
  teams_assigned
  in_progress
  completed
}

enum MatchStatus {
  scheduled
  ready
  in_progress
  completed
  cancelled
}

enum TournamentLevel {
  cluster
  division
  final
}

enum GenderCategory {
  men
  women
  mixed
}
```

## 🔧 ONLY 3 Fields Need to be Added to Existing Schema

### **Missing Fields Analysis:**

#### 1. **Fixture Model - Add 3 fields:**
```sql
-- Add to existing fixtures table
ALTER TABLE fixtures ADD COLUMN champion_team_id UUID REFERENCES teams(id);
ALTER TABLE fixtures ADD COLUMN champion_team_name VARCHAR(200);
ALTER TABLE fixtures ADD COLUMN completed_at TIMESTAMPTZ(6);
```

#### 2. **Match Model - Add 2 fields (if missing):**
```sql
-- Add to existing matches table (check if these exist first)
ALTER TABLE matches ADD COLUMN scheduled_time TIMESTAMPTZ(6);
ALTER TABLE matches ADD COLUMN actual_start_time TIMESTAMPTZ(6);
```

### **✅ Everything Else Already Exists:**

1. **Fixture Management**: ✅ Complete
2. **Match Bracket System**: ✅ Complete with `dependsOnMatch1Id`, `dependsOnMatch2Id`, `nextMatchId`
3. **Team Tournament Numbers**: ✅ Complete with `tournamentNumber`, `tournamentNumberAssignedAt`
4. **Venue Level Mapping**: ✅ Complete with `VenueLevelMapping` model
5. **All Enums**: ✅ `FixtureStatus`, `MatchStatus`, `TournamentLevel`, `GenderCategory`
6. **Relations**: ✅ All foreign keys and cascading deletes properly set up

## tRPC Router Implementation

### File: `src/server/api/routers/volunteers/fixture.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

export const volunteerFixtureRouter = createTRPCRouter({
  // Get venue fixtures
  getVenueFixtures: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Check volunteer permissions
      if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Get venue level mappings for this venue
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true },
        include: {
          fixtures: {
            include: {
              sport: true,
              matches: {
                select: { id: true, status: true, roundName: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Flatten fixtures from all venue level mappings
      const fixtures = venueLevelMappings.flatMap(vlm => vlm.fixtures);
      
      return fixtures;
    }),

  // Get available sports for fixture creation
  getAvailableSportsForFixture: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Get venue level mappings
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      if (venueLevelMappings.length === 0) {
        return [];
      }

      // Get checked-in teams for this venue (via team venue assignments)
      const teamAssignments = await ctx.db.teamVenueAssignment.findMany({
        where: {
          OR: [
            { clusterVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
            { divisionVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
            { finalVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } }
          ]
        },
        include: {
          team: {
            include: {
              sport: true
            },
            where: {
              OR: [
                { checkedIn: true },
                { matchDayStatus: 'checked_in' }
              ]
            }
          }
        }
      });

      // Group by sport and gender
      const sportGroups = teamAssignments.reduce((acc, assignment) => {
        if (!assignment.team) return acc;
        
        const key = `${assignment.team.sportId}_${assignment.team.genderCategory}`;
        if (!acc[key]) {
          acc[key] = {
            sportId: assignment.team.sportId,
            sportName: assignment.team.sport.displayName,
            genderCategory: assignment.team.genderCategory,
            teams: []
          };
        }
        acc[key].teams.push(assignment.team);
        return acc;
      }, {} as Record<string, any>);

      // Return only sports with 2+ teams
      return Object.values(sportGroups)
        .filter((group: any) => group.teams.length >= 2)
        .map((group: any) => ({
          sportId: group.sportId,
          sportName: group.sportName,
          genderCategory: group.genderCategory,
          teamCount: group.teams.length
        }));
    }),

  // Create fixture
  createFixture: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      name: z.string(),
      sportId: z.string(),
      genderCategory: z.string(),
      level: z.enum(['cluster', 'division', 'final']),
      maxTeams: z.number(),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get venue level mapping
      const venueLevelMapping = await ctx.db.venueLevelMapping.findFirst({
        where: {
          venueId: input.venueId,
          level: input.level,
          isActive: true
        },
        include: {
          venue: true,
          event: true
        }
      });

      if (!venueLevelMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue level mapping not found' });
      }

      // Get sport details
      const sport = await ctx.db.sport.findUnique({ where: { id: input.sportId } });
      if (!sport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sport not found' });
      }

      // Create fixture
      const fixture = await ctx.db.fixture.create({
        data: {
          name: input.name,
          eventId: venueLevelMapping.eventId,
          sportId: input.sportId,
          venueLevelMappingId: venueLevelMapping.id,
          genderCategory: input.genderCategory as any,
          level: input.level,
          status: 'draft'
        }
      });

      return { success: true, fixtureId: fixture.id };
    }),

  // Assign team numbers
  assignTeamNumbers: protectedProcedure
    .input(z.object({
      venueLevelMappingId: z.string(),
      assignments: z.array(z.object({
        teamId: z.string(),
        number: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Update teams with tournament numbers
      await Promise.all(
        input.assignments.map(assignment =>
          ctx.db.team.update({
            where: { id: assignment.teamId },
            data: {
              tournamentNumber: assignment.number,
              tournamentNumberAssignedAt: new Date(),
              tournamentNumberVenueMappingId: input.venueLevelMappingId
            }
          })
        )
      );

      return { success: true };
    }),

  // Create knockout draw
  createKnockoutDraw: protectedProcedure
    .input(z.object({
      fixtureId: z.string(),
      venueLevelMappingId: z.string(),
      sportId: z.string(),
      genderCategory: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get fixture details
      const fixture = await ctx.db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          venueLevelMapping: {
            include: { venue: true }
          },
          sport: true
        }
      });

      if (!fixture) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fixture not found' });
      }

      // Get teams with tournament numbers
      const teams = await ctx.db.team.findMany({
        where: {
          sportId: input.sportId,
          genderCategory: input.genderCategory,
          tournamentNumberVenueMappingId: input.venueLevelMappingId,
          tournamentNumber: { not: null }
        },
        orderBy: { tournamentNumber: 'asc' }
      });

      if (teams.length < 2) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Need at least 2 teams with assigned numbers' });
      }

      // Generate bracket structure
      const bracket = generateKnockoutBracket(teams);

      // Create matches in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Update fixture status
        await tx.fixture.update({
          where: { id: input.fixtureId },
          data: { status: 'in_progress' }
        });

        // Create matches
        const matches = await Promise.all(
          bracket.matches.map((bracketMatch, index) =>
            tx.match.create({
              data: {
                fixtureId: input.fixtureId,
                eventId: fixture.eventId,
                sportId: input.sportId,
                venueLevelMappingId: input.venueLevelMappingId,
                genderCategory: input.genderCategory as any,
                roundName: bracketMatch.roundName,
                matchNumber: index + 1,
                team1Id: bracketMatch.team1Id,
                team2Id: bracketMatch.team2Id,
                dependsOnMatch1Id: bracketMatch.dependsOnMatch1Id,
                dependsOnMatch2Id: bracketMatch.dependsOnMatch2Id,
                nextMatchId: bracketMatch.nextMatchId,
                nextSlot: bracketMatch.nextSlot,
                status: (bracketMatch.team1Id && bracketMatch.team2Id) ? 'ready' : 'scheduled'
              }
            })
          )
        );

        return { matches };
      });

      return {
        success: true,
        totalMatches: result.matches.length,
        totalTeams: teams.length
      };
    }),

  // Get fixture details
  getFixtureDetails: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const fixture = await ctx.db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          sport: true,
          venueLevelMapping: {
            include: { venue: true }
          },
          matches: {
            include: {
              team1: true,
              team2: true,
              winner: true
            },
            orderBy: { matchNumber: 'asc' }
          }
        }
      });

      if (!fixture) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fixture not found' });
      }

      return { fixture };
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
        orderBy: { scheduledTime: 'asc' }
      });
    })
});

// Helper function for bracket generation (same as Firebase version)
function generateKnockoutBracket(teams: any[]) {
  // Implementation remains the same as Firebase version
  // Returns bracket structure with match dependencies
}
```

## UI Components Migration

### 1. Fixtures List Page: `/volunteer/venues/[venueId]/fixtures/page.tsx`

**Key Changes:**
- Replace Firebase calls with tRPC hooks
- Update data structure handling
- Maintain existing UI/UX

```typescript
// Replace Firebase imports
import { api } from '@/server/trpc/react';

// Replace data fetching
const { data: fixtures, isLoading, refetch } = api.volunteers.fixture.getVenueFixtures.useQuery(
  { venueId },
  { enabled: !!user && !!venueId }
);

const { data: availableSports } = api.volunteers.fixture.getAvailableSportsForFixture.useQuery(
  { venueId },
  { enabled: !!user && !!venueId }
);
```

### 2. Create Fixture Page: `/volunteer/venues/[venueId]/fixtures/create/page.tsx`

**Key Changes:**
- Replace server actions with tRPC mutations
- Update form handling
- Maintain validation logic

```typescript
const createFixtureMutation = api.volunteers.fixture.createFixture.useMutation({
  onSuccess: (data) => {
    router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${data.fixtureId}`);
  }
});
```

### 3. Create Draw Page: `/volunteer/venues/[venueId]/fixtures/create-draw/page.tsx`

**Key Changes:**
- Replace server actions with tRPC mutations
- Update team number assignment
- Maintain bracket generation UI

```typescript
const assignNumbersMutation = api.volunteers.fixture.assignTeamNumbers.useMutation();
const createDrawMutation = api.volunteers.fixture.createKnockoutDraw.useMutation();
```

### 4. Fixture Details Page: `/volunteer/venues/[venueId]/fixtures/[fixtureId]/page.tsx`

**Key Changes:**
- Replace server-side data fetching with tRPC
- Update bracket visualization
- Maintain match progression display

```typescript
const { data: fixtureData } = api.volunteers.fixture.getFixtureDetails.useQuery(
  { fixtureId },
  { enabled: !!fixtureId }
);
```

## Database Migration Steps

### 1. Create Migration Files
```sql
-- Create fixtures table
CREATE TABLE fixtures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sport_id TEXT NOT NULL,
  sport_name TEXT NOT NULL,
  gender_category TEXT NOT NULL,
  level TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  assigned_teams TEXT[] DEFAULT '{}',
  checked_in_teams TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  final_standings JSONB,
  champion_team_id TEXT,
  champion_team_name TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bracket_matches table
CREATE TABLE bracket_matches (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  match_id TEXT,
  team1_id TEXT,
  team2_id TEXT,
  winner_id TEXT,
  round_name TEXT NOT NULL,
  next_match_id TEXT,
  next_slot TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  fixture_name TEXT NOT NULL,
  sport_id TEXT NOT NULL,
  sport_name TEXT NOT NULL,
  gender_category TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  round_name TEXT NOT NULL,
  next_match_id TEXT,
  next_slot TEXT,
  match_number INTEGER NOT NULL,
  team1 JSONB,
  team2 JSONB,
  status TEXT DEFAULT 'scheduled',
  result JSONB,
  scheduled_time TIMESTAMP,
  actual_start_time TIMESTAMP,
  completed_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add tournament number fields to teams
ALTER TABLE teams ADD COLUMN tournament_number INTEGER;
ALTER TABLE teams ADD COLUMN number_assigned_at TIMESTAMP;
ALTER TABLE teams ADD COLUMN number_assigned_venue TEXT;

-- Create indexes
CREATE INDEX idx_fixtures_venue_id ON fixtures(venue_id);
CREATE INDEX idx_fixtures_sport_id ON fixtures(sport_id);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_bracket_matches_fixture_id ON bracket_matches(fixture_id);
CREATE INDEX idx_matches_fixture_id ON matches(fixture_id);
CREATE INDEX idx_matches_venue_id ON matches(venue_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_teams_tournament_number ON teams(tournament_number);
```

### 2. Data Migration Script
```typescript
// scripts/migrate-fixtures.ts
import { db } from '@/lib/db';
import { adminDb } from '@/lib/firebase/admin';

async function migrateFixtures() {
  const fixturesSnapshot = await adminDb.collection('fixtures').get();
  
  for (const doc of fixturesSnapshot.docs) {
    const data = doc.data();
    
    await db.fixture.create({
      data: {
        id: doc.id,
        name: data.name,
        sportId: data.sportId,
        sportName: data.sportName,
        genderCategory: data.genderCategory,
        level: data.level,
        venueId: data.venueId,
        venueName: data.venueName,
        assignedTeams: data.assignedTeams || [],
        checkedInTeams: data.checkedInTeams || [],
        status: data.status,
        finalStandings: data.finalStandings,
        championTeamId: data.championTeamId,
        championTeamName: data.championTeamName,
        completedAt: data.completedAt?.toDate(),
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
- Test bracket generation logic
- Test data transformations

### 2. Integration Tests
- Test complete fixture creation flow
- Test tournament draw generation
- Test match progression

### 3. E2E Tests
- Test volunteer fixture management workflow
- Test UI interactions
- Test data persistence

## Performance Considerations

### 1. Database Optimization
- Proper indexing on frequently queried fields
- JSON field optimization for team/result data
- Connection pooling for concurrent requests

### 2. Caching Strategy
- Cache fixture lists per venue
- Cache team data for bracket generation
- Invalidate cache on fixture updates

### 3. Real-time Updates
- Consider WebSocket integration for live match updates
- Implement optimistic updates for better UX

## Security Considerations

### 1. Authorization
- Verify volunteer permissions for venue access
- Validate fixture ownership before modifications
- Implement role-based access control

### 2. Data Validation
- Validate team assignments
- Ensure tournament number uniqueness
- Validate bracket structure integrity

## Rollback Plan

### 1. Dual Write Period
- Write to both Firebase and PostgreSQL
- Compare results for consistency
- Gradual migration of read operations

### 2. Feature Flags
- Toggle between Firebase and PostgreSQL
- Per-venue migration capability
- Quick rollback if issues arise

## Migration Timeline

### Phase 1: Database Setup (Week 1)
- Create Prisma models
- Run database migrations
- Set up tRPC routers

### Phase 2: Backend Migration (Week 2)
- Implement tRPC procedures
- Migrate bracket generation logic
- Add comprehensive testing

### Phase 3: Frontend Migration (Week 3)
- Update UI components
- Replace Firebase calls with tRPC
- Test volunteer workflows

### Phase 4: Data Migration (Week 4)
- Migrate existing fixture data
- Validate data integrity
- Performance testing

### Phase 5: Deployment (Week 5)
- Deploy to staging
- User acceptance testing
- Production deployment with rollback plan

## Success Metrics

1. **Performance**: Page load times < 2s
2. **Reliability**: 99.9% uptime during tournaments
3. **Data Integrity**: Zero data loss during migration
4. **User Experience**: No workflow disruption for volunteers
5. **Scalability**: Support for 100+ concurrent fixtures

This migration will provide a more robust, scalable, and maintainable fixture management system while preserving all existing functionality and improving performance.
