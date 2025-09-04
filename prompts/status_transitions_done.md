# Team-Player Status Transition Implementation Guide

## Overview & Context

You are implementing cascading status logic between teams and players in the Isha Gramotsavam sports tournament management system. Currently, the status transitions are broken or missing in both admin and volunteer interfaces.

### Business Context:
- **Teams** go through verification stages: `draft` → `submitted` → `checked_in` → `verified` → `rejected`
- **Players** within teams have statuses: `pending` → `approved` → `verified` → `rejected`
- **Status changes must cascade bidirectionally** between teams and their players
- **Conditional logic** prevents improper status transitions

### Current Issues:
1. Team status changes don't cascade to players
2. Player status changes don't update team status
3. Missing conditional checks for specific status transitions
4. Inconsistent behavior between admin and volunteer interfaces

---

## REQUIRED STATUS TRANSITION LOGIC

### 1. Team → Players (Cascade Down)

**When team status changes, update ALL players in that team:**

```typescript
// Team status change triggers player updates
const updatePlayersFromTeamStatus = async (teamId: string, newTeamStatus: string) => {
  let playerStatus: string | null = null;
  
  // Define cascading rules
  if (newTeamStatus === 'checked_in') {
    playerStatus = 'approved';        // Team checked_in → All players approved
  } else if (newTeamStatus === 'verified') {
    playerStatus = 'verified';        // Team verified → All players verified  
  } else if (newTeamStatus === 'submitted') {
    playerStatus = 'pending';         // Team submitted → All players pending
  }
  // Note: 'draft' and 'rejected' don't cascade to players automatically
  
  // Update all players if cascade rule exists
  if (playerStatus) {
    await db.player.updateMany({
      where: { teamId },
      data: { verificationStatus: playerStatus }
    });
  }
};
```

### 2. Players → Team (Cascade Up with Conditions)

**When ANY player status changes, recalculate team status:**

```typescript
const updateTeamFromPlayerStatuses = async (teamId: string) => {
  // Get current team data
  const currentTeam = await db.team.findUnique({
    where: { id: teamId },
    include: { players: true }
  });
  
  if (!currentTeam) return;
  
  const playerStatuses = currentTeam.players.map(p => p.verificationStatus);
  const currentTeamStatus = currentTeam.status;
  let newTeamStatus = currentTeamStatus; // Default to current status
  
  // Priority-based status resolution (highest priority first)
  if (playerStatuses.some(s => s === 'rejected')) {
    // ANY player rejected → Team rejected (always)
    newTeamStatus = 'rejected';
    
  } else if (playerStatuses.some(s => s === 'pending')) {
    // ANY player pending → Team submitted (only if team is not draft)
    if (currentTeamStatus !== 'draft') {
      newTeamStatus = 'submitted';
    }
    
  } else if (playerStatuses.every(s => s === 'approved')) {
    // ALL players approved → Team checked_in (always)
    newTeamStatus = 'checked_in';
    
  } else if (playerStatuses.every(s => s === 'verified')) {
    // ALL players verified → Team verified (always)
    newTeamStatus = 'verified';
    
  } else if (playerStatuses.some(s => s === 'verified')) {
    // ANY player verified → Team verified (only if team is checked_in)
    if (currentTeamStatus === 'checked_in') {
      newTeamStatus = 'verified';
    }
  }
  
  // Update team status if it changed
  if (newTeamStatus !== currentTeamStatus) {
    await db.team.update({
      where: { id: teamId },
      data: { status: newTeamStatus }
    });
    
    console.log(`🔄 Team ${teamId} status: ${currentTeamStatus} → ${newTeamStatus}`);
  }
};
```

---

## IMPLEMENTATION LOCATIONS

### Location 1: Admin Team Management
**File:** `src/app/[lang]/admin/teams/[teamId]/page.tsx`

#### Current State Analysis:
- Find existing mutation handlers for team status updates
- Find existing mutation handlers for player verification
- Check current TRPC endpoints being used

#### Required Changes:

**A. Team Status Update Handler:**
```typescript
// Find existing pattern like:
const updateTeamMutation = api.admin.team.updateStatus.useMutation({
  onSuccess: () => {
    // Add cascading logic here
  }
});

// Update to:
const updateTeamMutation = api.admin.team.updateStatus.useMutation({
  onSuccess: async (updatedTeam) => {
    // Trigger cascade to players
    await triggerPlayerStatusCascade(updatedTeam.id, updatedTeam.status);
    refetch(); // Refresh data to show updates
  }
});
```

**B. Player Verification Handler:**
```typescript
// Find existing pattern like:
const verifyPlayerMutation = api.admin.team.verifyPlayer.useMutation({
  onSuccess: () => {
    // Add cascading logic here
  }
});

// Update to:
const verifyPlayerMutation = api.admin.team.verifyPlayer.useMutation({
  onSuccess: async (updatedPlayer) => {
    // Trigger cascade to team
    await triggerTeamStatusCascade(updatedPlayer.teamId);
    refetch(); // Refresh data to show updates
  }
});
```

### Location 2: Volunteer Team Management
**File:** `src/app/[lang]/volunteer/venues/[venueId]/teams/[teamId]/page.tsx`

#### Current State Analysis:
- Find existing mutation handlers for player verification
- Find existing mutation handlers for team check-in
- Check current TRPC endpoints being used

#### Required Changes:

**A. Player Verification Handler:**
```typescript
// Find existing verification pattern and add cascading
const handleVerifyPlayer = async (playerId: string, status: 'verified' | 'rejected') => {
  try {
    await verifyPlayerMutation.mutateAsync({ 
      playerId, 
      status,
      // ... other params
    });
    
    // Cascade will be handled in backend mutation
    // UI will refresh automatically
    
  } catch (error) {
    // Handle error
  }
};
```

---

## BACKEND IMPLEMENTATION

### TRPC Router Updates

#### A. Admin Team Router
**File:** `src/server/api/routers/admin/team.ts` (or similar)

**Add/Update these mutations:**

```typescript
export const adminTeamRouter = createTRPCRouter({
  
  updateTeamStatus: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      status: z.enum(['draft', 'submitted', 'checked_in', 'verified', 'rejected']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update team status
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: { status: input.status },
      });
      
      // CASCADE: Team → Players
      await cascadeTeamStatusToPlayers(ctx.db, input.teamId, input.status);
      
      return updatedTeam;
    }),
  
  verifyPlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      status: z.enum(['pending', 'approved', 'verified', 'rejected']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update player status
      const updatedPlayer = await ctx.db.player.update({
        where: { id: input.playerId },
        data: { 
          verificationStatus: input.status,
          verificationNotes: input.notes,
          verifiedAt: new Date(),
          verifiedBy: ctx.user.id,
        },
      });
      
      // CASCADE: Players → Team
      await cascadePlayerStatusToTeam(ctx.db, updatedPlayer.teamId);
      
      return updatedPlayer;
    }),
});

// Helper functions
async function cascadeTeamStatusToPlayers(db: any, teamId: string, teamStatus: string) {
  let playerStatus: string | null = null;
  
  if (teamStatus === 'checked_in') {
    playerStatus = 'approved';
  } else if (teamStatus === 'verified') {
    playerStatus = 'verified';
  } else if (teamStatus === 'submitted') {
    playerStatus = 'pending';
  }
  
  if (playerStatus) {
    await db.player.updateMany({
      where: { teamId },
      data: { verificationStatus: playerStatus },
    });
    console.log(`🔄 Team ${teamId} (${teamStatus}) cascaded to players (${playerStatus})`);
  }
}

async function cascadePlayerStatusToTeam(db: any, teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { players: true },
  });
  
  if (!team) return;
  
  const playerStatuses = team.players.map(p => p.verificationStatus);
  const currentTeamStatus = team.status;
  let newTeamStatus = currentTeamStatus;
  
  // Apply cascading logic (same as above)
  if (playerStatuses.some(s => s === 'rejected')) {
    newTeamStatus = 'rejected';
  } else if (playerStatuses.some(s => s === 'pending') && currentTeamStatus !== 'draft') {
    newTeamStatus = 'submitted';
  } else if (playerStatuses.every(s => s === 'approved')) {
    newTeamStatus = 'checked_in';
  } else if (playerStatuses.every(s => s === 'verified')) {
    newTeamStatus = 'verified';
  } else if (playerStatuses.some(s => s === 'verified') && currentTeamStatus === 'checked_in') {
    newTeamStatus = 'verified';
  }
  
  if (newTeamStatus !== currentTeamStatus) {
    await db.team.update({
      where: { id: teamId },
      data: { status: newTeamStatus },
    });
    console.log(`🔄 Team ${teamId} status: ${currentTeamStatus} → ${newTeamStatus}`);
  }
}
```

#### B. Volunteer Team Router
**File:** `src/server/api/routers/volunteers/team.ts` (or similar)

Apply the same cascading logic in volunteer mutations:

```typescript
export const volunteerTeamRouter = createTRPCRouter({
  
  verifyPlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      status: z.enum(['pending', 'approved', 'verified', 'rejected']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Same implementation as admin version
      const updatedPlayer = await ctx.db.player.update({
        where: { id: input.playerId },
        data: { 
          verificationStatus: input.status,
          verificationNotes: input.notes,
          verifiedAt: new Date(),
          verifiedBy: ctx.user.id,
        },
      });
      
      // CASCADE: Players → Team
      await cascadePlayerStatusToTeam(ctx.db, updatedPlayer.teamId);
      
      return updatedPlayer;
    }),
  
  // Add team check-in with cascading
  checkInTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update team to checked_in
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: { 
          status: 'checked_in',
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id,
          checkInNotes: input.notes,
        },
      });
      
      // CASCADE: Team → Players (checked_in → approved)
      await cascadeTeamStatusToPlayers(ctx.db, input.teamId, 'checked_in');
      
      return updatedTeam;
    }),
});
```

---

## TESTING SCENARIOS

### Test Cases to Validate

#### **Scenario 1: Team Status Cascades Down**
```
Given: Team has 3 players with mixed statuses
When: Admin changes team status to "checked_in"
Then: All 3 players should become "approved"
And: UI should reflect the changes immediately
```

#### **Scenario 2: Player Status Cascades Up**
```
Given: Team status is "checked_in" with 3 "approved" players
When: Volunteer marks 1 player as "verified"  
Then: Team status should become "verified"
And: Other players remain "approved"
```

#### **Scenario 3: Conditional Logic - Draft Protection**
```
Given: Team status is "draft" with 1 "pending" player
When: Player status changes to "pending"
Then: Team status should remain "draft" (not change to "submitted")
```

#### **Scenario 4: Conditional Logic - Verification**
```
Given: Team status is "submitted" with mixed player statuses
When: Player becomes "verified"
Then: Team status should remain "submitted" (only "checked_in" teams can become "verified")
```

#### **Scenario 5: Rejection Priority**
```
Given: Team with mix of "approved" and "verified" players
When: 1 player is marked "rejected"
Then: Team status should become "rejected" immediately
And: Other player statuses remain unchanged
```

#### **Scenario 6: All Players Approved**
```
Given: Team status is "submitted" 
When: Last "pending" player becomes "approved"
Then: Team status should become "checked_in"
```

### Testing Commands

```bash
# Test database changes
npm run db:studio
# Check that both team and player records update correctly

# Test UI updates  
# Navigate to admin/teams/[teamId] and volunteer/teams/[teamId]
# Verify status changes reflect immediately in the UI

# Test API responses
# Use network tab to verify cascade mutations are called
# Check server logs for cascade confirmation messages
```

---

## VALIDATION CHECKPOINTS

### ✅ Before Implementation Starts
- [ ] Identify all current team status update mutation points
- [ ] Identify all current player verification mutation points  
- [ ] Map out current TRPC router structure
- [ ] Document current broken behaviors

### ✅ During Implementation
- [ ] Team → Player cascade works for all status transitions
- [ ] Player → Team cascade respects conditional logic
- [ ] Both admin and volunteer interfaces use same backend logic
- [ ] UI updates reflect changes immediately
- [ ] No infinite cascade loops occur

### ✅ After Implementation Complete  
- [ ] All 6 test scenarios pass completely
- [ ] Database shows correct status updates for both entities
- [ ] UI shows immediate feedback with correct statuses
- [ ] Server logs show cascade confirmations
- [ ] No errors in browser console during status changes
- [ ] Performance is acceptable (cascades complete within 1-2 seconds)

---

## IMPLEMENTATION PRIORITY

### **Phase 1: Backend Cascade Logic**
1. Implement `cascadeTeamStatusToPlayers` function
2. Implement `cascadePlayerStatusToTeam` function  
3. Add cascade calls to existing mutations
4. Test backend logic with API calls

### **Phase 2: Admin Interface Integration**
1. Update admin team status mutations to trigger cascades
2. Update admin player verification to trigger cascades
3. Test admin interface with all scenarios

### **Phase 3: Volunteer Interface Integration**
1. Update volunteer player verification to trigger cascades  
2. Update volunteer team check-in to trigger cascades
3. Test volunteer interface with all scenarios

### **Phase 4: End-to-End Validation**
1. Run all test scenarios
2. Validate UI responsiveness
3. Check for any edge case failures
4. Performance optimization if needed

---

## SUCCESS CRITERIA

**Implementation is complete when:**

✅ **Bidirectional Cascading**: Team ↔ Player status changes flow both ways automatically  
✅ **Conditional Logic**: Draft and checked_in conditions are properly enforced  
✅ **Priority Handling**: Rejected status takes precedence over all others  
✅ **UI Consistency**: Both admin and volunteer interfaces behave identically  
✅ **Immediate Feedback**: Status changes appear instantly in the UI  
✅ **Data Integrity**: Database shows consistent team-player status relationships  
✅ **Performance**: All cascades complete within 2 seconds  
✅ **Error Handling**: Failed cascades don't break the UI or leave partial updates

**This implementation will create a robust, user-friendly status management system that handles all the complex business rules while maintaining data consistency and providing immediate user feedback.**