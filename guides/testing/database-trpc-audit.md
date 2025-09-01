# Database Schema and tRPC Configuration Audit Report

## Overview
Comprehensive audit of the database schema, tRPC configuration, API router structure, data validation, and performance optimization for the Isha Gramotsavam Next.js application.

## Files Audited

### Database Schema
- `/prisma/schema.prisma` - Complete database schema definition
- `/src/lib/db.ts` - Database connection configuration
- `/prisma/migrations/` - Database migration files
- Database relationship and constraint analysis

### tRPC Configuration  
- `/src/server/api/trpc.ts` - tRPC configuration and middleware
- `/src/server/api/root.ts` - API router organization
- `/src/server/trpc/react.tsx` - Client-side tRPC configuration
- `/src/server/trpc/server.ts` - Server-side tRPC setup

### API Routers
- `/src/server/api/routers/admin/**` - Admin operation routers
- `/src/server/api/routers/teams/**` - Team management routers
- `/src/server/api/routers/volunteers/**` - Volunteer operation routers
- `/src/server/api/routers/profile.ts` - Profile management router

## Critical Database Issues Found

### 🔴 Missing Database Constraints

**Location**: `/prisma/schema.prisma:463-495`
```prisma
model TeamPlayer {
  id                   String   @id @default(cuid())
  teamId              String
  userId              String
  age                 Int      // Missing age validation constraint
  position            String?
  verificationStatus  String   @default("pending")
  
  @@unique([teamId, userId])
}
```
**Issue**: No database-level constraint for age validation - allows invalid ages like negative numbers or unrealistic values

**Location**: `/prisma/schema.prisma:530-548`
```prisma
model Team {
  tournamentNumber            Int?
  tournamentNumberVenueMappingId String?
  // Missing unique constraint for tournamentNumber per venue
}
```
**Issue**: Tournament numbers can be duplicated within the same venue mapping

### 🔴 Critical Index Missing

**Location**: `/prisma/schema.prisma:182-210`
```prisma
model Match {
  scheduledTime     DateTime?
  dependsOnMatch1Id String?
  dependsOnMatch2Id String?
  // Missing indexes on scheduledTime and dependency fields
}
```
**Issue**: Time-based match queries will be extremely slow without proper indexing

**Location**: `/prisma/schema.prisma:773-785`
```prisma
model VolunteerAssignment {
  volunteerId String
  eventId     String
  // Missing composite index on volunteerId + eventId
}
```
**Issue**: Volunteer assignment lookups will have poor performance

### 🔴 Data Integrity Vulnerabilities

**Location**: `/prisma/schema.prisma:182-184`
```prisma
model Match {
  dependsOnMatch1Id String?
  dependsOnMatch2Id String?
  // Potential for circular dependencies
}
```
**Issue**: No constraint preventing matches from depending on themselves or creating circular dependencies

## High Priority Security Issues

### 🟠 SQL Injection Vulnerability

**Location**: `/src/server/api/routers/admin/teams.ts:40-72`
```typescript
const where: any = {};

if (input.searchQuery) {
  where.OR = [
    { name: { contains: input.searchQuery, mode: 'insensitive' } },
    { captainUser: { firstName: { contains: input.searchQuery, mode: 'insensitive' } } },
  ];
}

if (input.sport) {
  where.sport = { name: { contains: input.sport, mode: 'insensitive' } };
}
```
**Issue**: Dynamic `where` clause construction with user input without proper sanitization - potential for object injection attacks

### 🟠 Authentication Context Issues

**Location**: `/src/server/api/trpc.ts:28-67`
```typescript
// Get user from session/cookies
let user: ContextUser | null = null;
try {
  // Check for user ID in cookies or headers
  const userId = req.cookies?.userId || req.headers.userid as string;
  if (userId) {
    // Database fallback without proper authentication
    const dbUser = await db.user.findUnique({
      where: { id: userId }
    });
  }
}
```
**Issue**: Fallback to database lookup without proper session validation creates authentication bypass opportunity

### 🟠 Role-Based Access Control Gaps

**Location**: `/src/server/api/trpc.ts:119-129`
```typescript
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({ ctx })
})
```
**Issue**: Simple string-based role checking without granular permissions or role hierarchy

## Performance Issues

### 🟡 N+1 Query Problems

**Location**: `/src/server/api/routers/admin/dashboard.ts:37-47`
```typescript
// Multiple individual queries instead of batch operations
const totalTeams = await db.team.count();
const verifiedTeams = await db.team.count({
  where: { status: 'verified' }
});
const rejectedTeams = await db.team.count({
  where: { status: 'rejected' }
});
```
**Issue**: Multiple separate count queries when a single aggregation query would be more efficient

### 🟡 Inefficient Database Queries

**Location**: `/src/server/api/routers/volunteers/dashboard.ts:60-85`
```typescript
// Sequential processing instead of batch operations
const teamStats = await Promise.all(venues.map(async (venue) => {
  const teams = await db.team.findMany({
    where: { venueId: venue.id }
  });
  // Individual queries for each venue
}));
```
**Issue**: Sequential database queries in loops instead of optimized batch operations

### 🟡 Missing Connection Optimization

**Location**: `/src/lib/db.ts:10-15`
```typescript
const prisma = new PrismaClient({
  log: ['query'], // Query logging enabled in production
});
```
**Issue**: Query logging enabled without environment check - impacts production performance

## tRPC Configuration Analysis

### ✅ Strengths Found

**Location**: `/src/server/api/trpc.ts:84-94`
```typescript
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})
```
**Strength**: Proper SuperJSON transformer and comprehensive error formatting

### 🟡 tRPC Issues

**Location**: `/src/server/trpc/react.tsx:42-65`
```typescript
transformer: superjson,
links: [
  loggerLink({
    enabled: (op) =>
      process.env.NODE_ENV === 'development' ||
      (op.direction === 'down' && op.result instanceof Error),
  }),
  httpBatchLink({
    url: '/api/trpc',
    // Missing request timeout configuration
  })
]
```
**Issue**: Missing timeout configuration for HTTP requests

## Database Schema Design Issues

### 🟡 Normalization Problems

**Location**: `/prisma/schema.prisma:622-650`
```prisma
model User {
  panchayat    String?
  taluk        String?
  district     String?
  state        String?
  // Location data should be normalized into separate tables
}
```
**Issue**: Location data duplicated across users instead of normalized location entities

### 🟡 Missing Business Logic Constraints

**Location**: `/prisma/schema.prisma:490-510`
```prisma
model Team {
  status              String  @default("draft")
  registrationStatus  String? @default("incomplete")
  // No check constraints for valid status values at database level
}
```
**Issue**: Status values not constrained at database level - allows invalid statuses

## Data Validation Analysis

### ✅ Good Validation Patterns

**Location**: Multiple router files
- Comprehensive Zod schema validation for inputs
- Type-safe API contracts with TypeScript
- Proper error handling for validation failures

### 🟡 Validation Gaps

**Location**: `/src/server/api/routers/admin/teams.ts:194-212`
```typescript
.input(z.object({
  name: z.string().min(1),
  captainPhone: z.string().optional(),
  // Missing phone format validation
  captainDob: z.string().optional(),
  // Missing date format validation
}))
```
**Issue**: Missing format validation for phone numbers and dates

## Recommendations

### Immediate Actions (Critical)

1. **Add Database Constraints**:
   ```sql
   -- Add age constraint
   ALTER TABLE team_players ADD CONSTRAINT check_age 
   CHECK (age >= 10 AND age <= 80);
   
   -- Add unique tournament number per venue
   ALTER TABLE teams ADD CONSTRAINT unique_tournament_number_per_venue 
   UNIQUE (tournament_number, tournament_number_venue_mapping_id);
   ```

2. **Create Missing Indexes**:
   ```sql
   -- Performance critical indexes
   CREATE INDEX idx_matches_scheduled_time ON matches(scheduled_time);
   CREATE INDEX idx_volunteer_assignments_volunteer_event 
   ON volunteer_assignments(volunteer_id, event_id);
   ```

3. **Fix Input Validation**:
   ```typescript
   // Sanitize search queries
   const sanitizeInput = (input: string) => 
     input.replace(/[<>'"]/g, '').substring(0, 100);
   
   const where: Prisma.TeamWhereInput = {};
   if (input.searchQuery) {
     const sanitized = sanitizeInput(input.searchQuery);
     where.OR = [
       { name: { contains: sanitized, mode: 'insensitive' } }
     ];
   }
   ```

### Short-term Actions (High Priority)

1. **Optimize Database Queries**:
   ```typescript
   // Replace multiple queries with single aggregation
   const stats = await db.team.groupBy({
     by: ['status'],
     _count: { _all: true }
   });
   ```

2. **Implement Proper Authentication**:
   ```typescript
   // Add JWT token validation
   import jwt from 'jsonwebtoken';
   
   const validateToken = (token: string) => {
     try {
       return jwt.verify(token, process.env.JWT_SECRET!);
     } catch {
       throw new TRPCError({ code: 'UNAUTHORIZED' });
     }
   };
   ```

3. **Add Connection Pooling**:
   ```typescript
   // Configure Prisma connection pooling
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL + "?connection_limit=10&pool_timeout=20"
       }
     }
   });
   ```

### Long-term Actions (Medium Priority)

1. **Implement Granular Permissions**:
   ```typescript
   enum Permission {
     MANAGE_TEAMS = 'manage_teams',
     VIEW_REPORTS = 'view_reports',
     ASSIGN_VENUES = 'assign_venues'
   }
   
   const hasPermission = (user: User, permission: Permission) => {
     return user.role.permissions.includes(permission);
   };
   ```

2. **Add Comprehensive Audit Logging**:
   ```typescript
   const auditLog = {
     action: 'team_created',
     userId: ctx.user.id,
     entityId: team.id,
     timestamp: new Date(),
     metadata: { teamName: team.name }
   };
   ```

3. **Implement Caching Strategy**:
   ```typescript
   // Add Redis caching for frequently accessed data
   const getCachedTeamStats = async () => {
     const cached = await redis.get('team_stats');
     if (cached) return JSON.parse(cached);
     
     const stats = await db.team.groupBy({...});
     await redis.setex('team_stats', 300, JSON.stringify(stats));
     return stats;
   };
   ```

## Security Recommendations

### Authentication Security
1. Replace cookie-based authentication with JWT tokens
2. Implement proper session expiration and refresh
3. Add CSRF protection for state-changing operations
4. Implement rate limiting on authentication endpoints

### Database Security
1. Use parameterized queries exclusively
2. Implement database-level row security policies
3. Add audit trails for all admin operations
4. Encrypt sensitive data at rest

### API Security
1. Add request signing for admin operations
2. Implement API versioning strategy
3. Add comprehensive input validation
4. Use HTTPS-only cookies with secure flags

## Performance Optimization

### Database Performance
1. Implement proper indexing strategy based on query patterns
2. Use database read replicas for heavy read operations
3. Implement query result caching
4. Optimize database connection pooling

### Application Performance
1. Implement tRPC request deduplication
2. Add response compression
3. Use background job processing for heavy operations
4. Implement proper error boundary strategies

## Security Rating: ⚠️ HIGH RISK

The database and tRPC configuration have several critical security vulnerabilities that must be addressed before production deployment. The authentication system and input validation require immediate attention.

## Performance Rating: 📊 NEEDS OPTIMIZATION

While the basic structure is sound, several performance optimizations are needed to handle production load effectively. Database query optimization and proper indexing are critical for scalability.