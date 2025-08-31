# 🔧 TypeScript Error Fixes Guide - Isha Gramotsavam

## 🎯 Context-Aware Error Resolution Philosophy

**CRITICAL PRINCIPLE**: Never just delete code or add `any` types to fix errors. Always understand the functionality first, then implement proper type-safe solutions that maintain the intended behavior.

---

## 📋 Project Context Reference

### 🏗️ Architecture Overview
- **Stack**: Next.js 14 + TypeScript + Prisma + tRPC + PostgreSQL
- **Database**: Supabase PostgreSQL with comprehensive Prisma schema
- **Authentication**: Firebase Auth (transitioning)
- **UI**: Tailwind CSS with custom design tokens
- **State**: React Context + tRPC for server state

### 👥 User Roles & Permissions
```typescript
type UserRole = 
  | 'admin'                    // Complete system administration
  | 'captain'                  // Team creation and management
  | 'player'                   // Team participation
  | 'general_volunteer'        // Physical venue support
  | 'technical_volunteer'      // Venue management and match operations
  | 'verification_volunteer'   // Document and team verification
  | 'public'                   // Information access and registration
```

### 🗄️ Core Database Entities
**Always refer to `prisma/schema.prisma` for exact field types and relationships**

#### Key Models:
- **User**: Core user profiles with authentication
- **Team**: Team registrations with sport and venue assignments
- **TeamPlayer**: Player-team relationships with verification status
- **Fixture**: Tournament fixtures and brackets
- **Match**: Individual matches with results and scoring
- **Venue**: Competition venues with capacity and assignments
- **VenueLevelMapping**: Venue assignments by tournament level
- **TeamVenueAssignment**: Team venue assignments with auto/manual logic

#### Critical Relationships:
```prisma
// Team belongs to User (captain)
Team {
  captainId String
  captain   User @relation(fields: [captainId], references: [id])
}

// Team has many players through TeamPlayer
TeamPlayer {
  teamId   String
  playerId String
  team     Team @relation(fields: [teamId], references: [id])
  player   User @relation(fields: [playerId], references: [id])
}

// Team venue assignment through VenueLevelMapping
TeamVenueAssignment {
  teamId            String
  venueLevelMappingId String
  team              Team @relation(fields: [teamId], references: [id])
  venueMapping      VenueLevelMapping @relation(fields: [venueLevelMappingId], references: [id])
}
```

---

## 🛠️ Error Resolution Methodology

### Step 1: Understand the Functionality
**Before fixing any TypeScript error, ask:**
1. What is this component/function supposed to do?
2. What user role is this for?
3. What data does it work with?
4. How does it fit in the user journey?

### Step 2: Check Prisma Schema
**Always reference the actual schema:**
```bash
# Check the exact field types and relationships
cat prisma/schema.prisma | grep -A 20 "model TeamPlayer"
```

### Step 3: Implement Type-Safe Solution
**Never use these anti-patterns:**
- ❌ `any` types
- ❌ `@ts-ignore` comments
- ❌ Deleting functional code
- ❌ Optional chaining without understanding why data might be undefined

---

## 🔍 Common Error Patterns & Solutions

### 1. **Prisma Relation Type Errors**

#### ❌ Wrong Approach:
```typescript
// DON'T just add 'any' or delete the relation
const team: any = await prisma.team.findFirst();
```

#### ✅ Correct Approach:
```typescript
// Check Prisma schema first, then use proper include/select
const team = await prisma.team.findFirst({
  where: { id: teamId },
  include: {
    captain: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true
      }
    },
    players: {
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    },
    sport: true,
    venueAssignments: {
      include: {
        venueMapping: {
          include: {
            venue: true
          }
        }
      }
    }
  }
});

// Define proper type based on the query
type TeamWithRelations = NonNullable<typeof team>;
```

### 2. **tRPC Input/Output Type Mismatches**

#### ❌ Wrong Approach:
```typescript
// DON'T bypass validation
const input: any = ctx.input;
```

#### ✅ Correct Approach:
```typescript
// Define proper Zod schema based on Prisma model
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  sportId: z.string().uuid("Invalid sport ID"),
  captainId: z.string().uuid("Invalid captain ID"),
  panchayat: z.string().min(1, "Panchayat is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().min(1, "State is required"),
  // Match exactly with Prisma schema fields
});

// Use in tRPC procedure
createTeam: protectedProcedure
  .input(createTeamSchema)
  .mutation(async ({ input, ctx }) => {
    // input is now properly typed
    const team = await ctx.db.team.create({
      data: {
        ...input,
        // Ensure all required Prisma fields are provided
      }
    });
    return team;
  });
```

### 3. **Component Prop Type Errors**

#### ❌ Wrong Approach:
```typescript
// DON'T use generic types without understanding the data
interface Props {
  data: any[];
}
```

#### ✅ Correct Approach:
```typescript
// Define specific types based on actual data structure
interface TeamData {
  id: string;
  name: string;
  status: 'draft' | 'submitted' | 'verified' | 'checked_in' | 'rejected';
  captainUser?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  currentPlayers: number;
  verifiedPlayersCount: number;
  sport?: {
    name: string;
  };
}

interface TeamsPageProps {
  teams: TeamData[];
  venueId: string;
  onTeamUpdate: (teamId: string, updates: Partial<TeamData>) => void;
}
```

### 4. **Form Data Type Errors**

#### ❌ Wrong Approach:
```typescript
// DON'T ignore form validation
const handleSubmit = (data: any) => {
  // Process without validation
};
```

#### ✅ Correct Approach:
```typescript
// Use React Hook Form with Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  sportId: z.string().uuid("Please select a sport"),
  // Match with Prisma Team model fields
});

type TeamFormData = z.infer<typeof teamFormSchema>;

const TeamForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema)
  });

  const onSubmit = (data: TeamFormData) => {
    // data is properly typed and validated
    createTeamMutation.mutate(data);
  };
};
```

### 5. **API Response Type Errors**

#### ❌ Wrong Approach:
```typescript
// DON'T assume API response structure
const response: any = await fetch('/api/teams');
const teams = response.data;
```

#### ✅ Correct Approach:
```typescript
// Use tRPC for type-safe API calls
const { data: teams, isLoading, error } = api.teams.getTeamsForVenue.useQuery({
  venueId: venueId
});

// Or define proper response types for external APIs
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const response = await fetch('/api/teams') as ApiResponse<TeamData[]>;
if (response.success) {
  const teams = response.data; // Properly typed
}
```

---

## 🎯 Role-Specific Error Patterns

### Admin Interface Errors
**Context**: Admin manages system configuration, user roles, tournament setup

```typescript
// Admin can access all data - ensure proper permissions
const adminProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    return next();
  });
```

### Volunteer Interface Errors
**Context**: Volunteers manage venue operations, team check-ins, match scoring

```typescript
// Volunteers work with venue-specific data
const volunteerProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (!['technical_volunteer', 'verification_volunteer', 'general_volunteer'].includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Volunteer access required'
      });
    }
    return next();
  });

// Always include venue context for volunteers
const getTeamsForVenue = volunteerProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    // Ensure volunteer has access to this venue
    const assignment = await ctx.db.volunteerAssignment.findFirst({
      where: {
        userId: ctx.user.id,
        venueId: input.venueId,
        isActive: true
      }
    });

    if (!assignment) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No access to this venue'
      });
    }

    // Return properly typed venue teams
    return ctx.db.team.findMany({
      where: {
        venueAssignments: {
          some: {
            venueMapping: {
              venueId: input.venueId
            }
          }
        }
      },
      include: {
        captain: true,
        sport: true,
        players: {
          include: {
            player: true
          }
        }
      }
    });
  });
```

### Captain Interface Errors
**Context**: Captains create teams, manage players, submit for verification

```typescript
// Captains can only access their own teams
const captainProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user.role !== 'captain') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Captain access required'
      });
    }
    return next();
  });

const getMyTeams = captainProcedure
  .query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where: {
        captainId: ctx.user.id
      },
      include: {
        sport: true,
        players: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                verificationStatus: true
              }
            }
          }
        }
      }
    });
  });
```

---

## 🔧 Specific Component Error Fixes

### AdvancedTable Component Errors

#### Common Issue: Column render function types
```typescript
// ❌ Wrong: Generic any type
const columns: Column<any>[] = [
  {
    key: 'name',
    render: (value: any, item: any) => <span>{item.name}</span>
  }
];

// ✅ Correct: Specific typed columns
const columns: Column<TeamData>[] = [
  {
    key: 'name',
    header: 'Team Name',
    sortable: true,
    render: (value: string, team: TeamData) => (
      <div className="font-medium text-gray-900">
        {team.name}
      </div>
    )
  },
  {
    key: 'status',
    header: 'Status',
    render: (value: string, team: TeamData) => (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(team.status)}`}>
        {team.status}
      </span>
    )
  }
];
```

### EnhancedModal Component Errors

#### Common Issue: Form data handling
```typescript
// ❌ Wrong: Untyped form handling
const handleSubmit = (data: any) => {
  mutation.mutate(data);
};

// ✅ Correct: Typed form with validation
interface CreateTeamFormData {
  name: string;
  sportId: string;
  panchayat: string;
  district: string;
  state: string;
}

const CreateTeamModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema)
  });

  const createMutation = api.teams.create.useMutation({
    onSuccess: (newTeam) => {
      onSuccess(newTeam);
      onClose();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const onSubmit = (data: CreateTeamFormData) => {
    createMutation.mutate(data);
  };
};
```

---

## 📊 Database Query Error Patterns

### Venue Assignment Logic Errors
**Context**: Teams are assigned to venues through complex 3-tier logic

```typescript
// ❌ Wrong: Ignoring the venue assignment relationship
const getTeamVenue = async (teamId: string) => {
  const team: any = await prisma.team.findFirst({ where: { id: teamId } });
  return team.venue; // This field doesn't exist!
};

// ✅ Correct: Following the proper relationship chain
const getTeamVenue = async (teamId: string) => {
  const teamWithVenue = await prisma.team.findFirst({
    where: { id: teamId },
    include: {
      venueAssignments: {
        include: {
          venueMapping: {
            include: {
              venue: true
            }
          }
        }
      }
    }
  });

  // Handle the relationship properly
  const venueAssignment = teamWithVenue?.venueAssignments[0];
  return venueAssignment?.venueMapping.venue || null;
};
```

### Player Verification Status Errors
**Context**: Players have verification status that affects team eligibility

```typescript
// ❌ Wrong: Assuming direct verification field
const getVerifiedPlayers = async (teamId: string) => {
  const players: any[] = await prisma.user.findMany({
    where: { teamId: teamId, verified: true } // Wrong relationship!
  });
  return players;
};

// ✅ Correct: Using proper TeamPlayer relationship
const getVerifiedPlayers = async (teamId: string) => {
  const teamPlayers = await prisma.teamPlayer.findMany({
    where: {
      teamId: teamId,
      verificationStatus: 'verified'
    },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true
        }
      }
    }
  });

  return teamPlayers.map(tp => ({
    ...tp.player,
    verificationStatus: tp.verificationStatus,
    joinedAt: tp.createdAt
  }));
};
```

---

## 🎯 Testing Error Fixes

### Verify Your Fixes
1. **Type Check**: `npm run type-check`
2. **Build Check**: `npm run build`
3. **Runtime Test**: Test the actual functionality
4. **Database Test**: Verify queries work with real data

### Common Verification Steps
```typescript
// 1. Check if the component renders without errors
const TestComponent = () => {
  const { data, isLoading } = api.teams.getAll.useQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <AdvancedTable
      data={data || []}
      columns={teamColumns}
      // Ensure all required props are provided with correct types
    />
  );
};

// 2. Test the API endpoint
const testEndpoint = async () => {
  try {
    const result = await caller.teams.create({
      name: "Test Team",
      sportId: "valid-uuid",
      captainId: "valid-uuid",
      // Provide all required fields
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 🚨 Red Flags - When NOT to "Fix" Errors

### Don't Fix These Ways:
1. **Adding `any` types** - Defeats the purpose of TypeScript
2. **Using `@ts-ignore`** - Hides real issues
3. **Deleting functional code** - Breaks user functionality
4. **Making fields optional** - Without understanding why they might be undefined
5. **Removing validation** - Compromises data integrity

### Instead, Investigate:
1. **Why is this field undefined?** - Check the database query
2. **What's the expected data flow?** - Trace from API to component
3. **Is the Prisma schema correct?** - Verify relationships
4. **Are we handling loading states?** - Add proper loading/error handling

---

## 📚 Reference Checklist

Before fixing any TypeScript error:

- [ ] **Read the error message completely** - Understand what TypeScript is telling you
- [ ] **Check the Prisma schema** - Verify field names, types, and relationships
- [ ] **Understand the user role context** - Who uses this feature and how?
- [ ] **Trace the data flow** - From database → API → component → UI
- [ ] **Check existing patterns** - How do similar components handle this?
- [ ] **Test the fix** - Ensure functionality still works as intended
- [ ] **Verify types are accurate** - Types should reflect reality, not just silence errors

---

## 🎯 Success Criteria

A properly fixed TypeScript error should:

✅ **Maintain Functionality**: The feature works exactly as before
✅ **Improve Type Safety**: Better type checking and IntelliSense
✅ **Follow Patterns**: Consistent with existing codebase patterns
✅ **Handle Edge Cases**: Proper loading, error, and empty states
✅ **Match Schema**: Types align with actual Prisma schema
✅ **Respect Permissions**: Proper role-based access control

---

*Remember: TypeScript errors are your friend - they prevent runtime bugs and improve code quality. Fix them properly by understanding the underlying functionality, not by silencing them.*
