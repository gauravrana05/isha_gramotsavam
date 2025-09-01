# Captain Section Audit Report

## Overview
Comprehensive audit of the captain section including frontend pages, backend APIs, team management workflows, and player operations.

## Files Audited

### Frontend Pages
- `/src/app/[lang]/captain/page.tsx` - Captain dashboard
- `/src/app/[lang]/captain/dashboard/page.tsx` - Main dashboard
- `/src/app/[lang]/captain/teams/create/page.tsx` - Team creation
- `/src/app/[lang]/captain/teams/page.tsx` - Team management
- `/src/app/[lang]/captain/layout.tsx` - Captain layout wrapper

### Backend APIs
- `/src/server/api/routers/teams/management.ts` - Team CRUD operations
- `/src/server/api/routers/teams/players.ts` - Player management
- `/src/server/api/routers/teams/verification.ts` - Team verification
- `/src/server/api/routers/teams/fixtures.ts` - Team fixture operations

### Components
- Captain-specific navigation and UI components
- Player management components
- Team verification components

## Critical Issues Found

### 🔴 Non-Functional Team Creation

**Location**: `/src/app/[lang]/captain/teams/create/page.tsx:89-104`
```typescript
const createTeamMutation = api.teams.management.createTeam.useMutation({
  onSuccess: (team) => {
    setTeamName('');
    setSport(null);
    setDescription('');
    addNotification('Team created successfully!', 'success');
    router.push(`/${lang}/captain/teams/${team.id}`);
  },
  onError: (error) => {
    console.error('Failed to create team:', error);
    addNotification('Failed to create team. Please try again.', 'error');
  }
});
```
**Issue**: The mutation calls `team.id` but the backend API doesn't return a team object with id field, causing navigation failure

**Backend Location**: `/src/server/api/routers/teams/management.ts:45-67`
```typescript
return { success: true, message: 'Team created successfully' };
```
**Issue**: Returns success object instead of created team data

### 🔴 Team Ownership Validation Missing

**Location**: `/src/server/api/routers/teams/players.ts:89-112`
```typescript
invitePlayer: protectedProcedure
  .input(z.object({
    teamId: z.string(),
    phone: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Missing team ownership check
    const team = await db.team.findUnique({
      where: { id: input.teamId }
    });
    // No verification that ctx.user is the team captain
  })
```
**Issue**: Any captain can invite players to any team - major security vulnerability

### 🔴 Data Integrity Risk in Player Operations

**Location**: `/src/server/api/routers/teams/players.ts:145-167`
```typescript
removePlayer: protectedProcedure
  .input(z.object({
    teamId: z.string(),
    playerId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Missing transaction wrapper
    await db.teamMember.deleteMany({
      where: {
        teamId: input.teamId,
        playerId: input.playerId
      }
    });
    
    await db.user.update({
      where: { id: input.playerId },
      data: { currentTeamId: null }
    });
    // These operations should be atomic
  })
```
**Issue**: Player removal not wrapped in transaction - potential data inconsistency

### 🔴 Type Safety Problems

**Location**: `/src/app/[lang]/captain/teams/page.tsx:156-162`
```typescript
const teams = teamsData?.teams || [];
// Frontend expects teamsData.teams but backend might return different structure

// Later used as:
data={teams as TeamWithMembers[]}
```
**Issue**: Unsafe type casting without proper validation

### 🔴 Authentication Bypass in Team Operations

**Location**: `/src/app/[lang]/captain/teams/[teamId]/page.tsx`
**Issue**: Page doesn't verify that the current user is the captain of the requested team

## High Priority Issues

### 🟠 Inconsistent Error Handling

**Location**: Multiple captain pages
**Issue**: Inconsistent error handling patterns - some mutations show notifications, others don't

### 🟠 Missing Loading States

**Location**: `/src/app/[lang]/captain/teams/create/page.tsx:145-189`
**Issue**: Form doesn't show loading state during team creation, leading to potential double submissions

### 🟠 Player Invitation Race Conditions

**Location**: `/src/server/api/routers/teams/players.ts:89-112`
```typescript
// Check if user exists
const existingUser = await db.user.findUnique({
  where: { phone: input.phone }
});

if (existingUser) {
  // Add to team
  await db.teamMember.create({
    data: {
      teamId: input.teamId,
      playerId: existingUser.id,
      role: 'player',
      status: 'active'
    }
  });
} else {
  // Create user and add to team
  const newUser = await db.user.create({...});
  await db.teamMember.create({...});
}
```
**Issue**: Race condition if multiple invitations for same phone number - potential duplicate users

### 🟠 Team Verification Workflow Issues

**Location**: `/src/server/api/routers/teams/verification.ts:23-45`
**Issue**: Missing validation for team completeness before allowing verification submission

## Medium Priority Issues

### 🟡 Performance Issues

**Location**: `/src/server/api/routers/teams/management.ts:78-102`
**Issue**: N+1 query problem when loading team members

### 🟡 Missing Input Validation

**Location**: `/src/server/api/routers/teams/players.ts:89`
```typescript
phone: z.string(), // Should validate phone format
firstName: z.string(), // Should have length limits
```

### 🟡 Inconsistent Team Status Management

**Issue**: Team status updates not properly synchronized across all related operations

## API Contract Issues

### Frontend Expects vs Backend Provides

**Team Creation Response**:
- Frontend expects: `{ id: string, name: string, ... }`
- Backend provides: `{ success: true, message: string }`

**Player List Response**:
- Frontend expects: `{ players: Player[] }`
- Backend provides: `{ teamMembers: TeamMember[] }`

## Security Vulnerabilities

### Team Ownership Bypass
```typescript
// Current vulnerable code:
const team = await db.team.findUnique({
  where: { id: input.teamId }
});

// Should be:
const team = await db.team.findFirst({
  where: { 
    id: input.teamId,
    captainId: ctx.user.id // Verify ownership
  }
});
if (!team) throw new TRPCError({ code: 'FORBIDDEN' });
```

### Player Invitation Security Gap
```typescript
// Missing team membership limits
const memberCount = await db.teamMember.count({
  where: { teamId: input.teamId }
});
if (memberCount >= MAX_TEAM_SIZE) {
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Team is full' });
}
```

## Recommendations

### Immediate Actions (Critical)

1. **Fix team creation workflow**:
   ```typescript
   // Backend should return created team
   const team = await db.team.create({
     data: { ... },
     include: { sport: true, captain: true }
   });
   return team;
   ```

2. **Add team ownership validation**:
   ```typescript
   // Add middleware for team operations
   const teamOwnerProcedure = protectedProcedure
     .input(z.object({ teamId: z.string() }))
     .use(async ({ ctx, input, next }) => {
       const team = await db.team.findFirst({
         where: { id: input.teamId, captainId: ctx.user.id }
       });
       if (!team) throw new TRPCError({ code: 'FORBIDDEN' });
       return next({ ctx: { ...ctx, team } });
     });
   ```

3. **Wrap player operations in transactions**:
   ```typescript
   await db.$transaction(async (tx) => {
     await tx.teamMember.delete({...});
     await tx.user.update({...});
   });
   ```

### Short-term Actions (High Priority)

1. Fix API contract mismatches
2. Add proper error handling and loading states
3. Implement team validation before operations
4. Add input sanitization and validation

### Long-term Actions (Medium Priority)

1. Optimize database queries
2. Implement comprehensive audit logging
3. Add real-time team updates
4. Enhance team verification workflow

## Security Rating: ⚠️ CRITICAL RISK

The captain section has fundamental security flaws that allow unauthorized team management and potential data corruption. The team ownership validation is completely missing, making this system unsafe for production use. Immediate remediation is required before any deployment.