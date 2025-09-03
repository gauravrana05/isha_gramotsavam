# Database Reset and Migration Agent Prompt

## Context
You are a database management specialist tasked with resetting a PostgreSQL database and creating fresh migrations for an Isha Gramotsavam tournament management system. The project uses Next.js with Prisma ORM and tRPC.

## Task Overview
1. **Reset the database completely** - drop all existing tables and data
2. **Delete existing migrations folder** (already done)
3. **Create a fresh migration** from the current schema
4. **Generate comprehensive seed data** for realistic testing

## Project Structure
- **Database**: PostgreSQL (Supabase hosted)
- **ORM**: Prisma
- **Framework**: Next.js 15 with tRPC
- **Schema Location**: `/prisma/schema.prisma`
- **Seed Location**: `/prisma/seed.ts`

## Step-by-Step Instructions

### 1. Database Connection Check
First, ensure the database connection is working:
```bash
npx prisma db pull --preview-feature
```

### 2. Reset Database (Choose one method)

**Option A - If database is accessible:**
```bash
npx prisma db push --force-reset
```

**Option B - If connection issues:**
```bash
npx prisma migrate reset --force
```

### 3. Create Fresh Migration
```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Seed Data Requirements

Create comprehensive seed data in `/prisma/seed.ts` with the following entities:

#### **Core Data**
- **Sports**: Football, Cricket, Volleyball, Badminton, Kabaddi, etc. (8-10 sports)
- **Locations**: 5-6 states with districts, panchayats, and villages
- **Venues**: 20-25 venues across different locations with proper mappings

#### **User Data** 
- **Admin Users**: 2-3 system administrators
- **Volunteers**: 15-20 volunteers (technical, general, verification types)
- **Players/Captains**: 100+ realistic player profiles with proper details

#### **Tournament Structure**
- **Teams**: 50-75 teams across different sports and locations
- **Tournament Levels**: Cluster → Division → Final progression
- **Fixtures**: Tournament brackets with proper scheduling
- **Matches**: Sample match results and progression
- **Venue Assignments**: Teams assigned to appropriate venues

#### **Verification Data**
- **Player Documents**: Mix of verified/pending/rejected statuses
- **Team Statuses**: Draft, submitted, verified, approved states
- **Match Day Data**: Check-in statuses and verification records

### 6. Seed Data Guidelines

**Realistic Data Requirements:**
- Use proper Indian names, phone numbers (+91 format)
- Include real district/panchayat names from different states
- Create meaningful team names related to locations
- Set appropriate tournament dates (current/upcoming)
- Include profile photos and document URLs (mock URLs)

**Data Relationships:**
- Ensure proper foreign key relationships
- Create logical tournament brackets
- Assign teams to appropriate venue levels
- Set volunteer assignments matching venue locations

**Status Distribution:**
- 60% verified/active records
- 25% pending verification
- 10% draft/incomplete
- 5% rejected/inactive

### 7. Execute Seeding
```bash
npx prisma db seed
```

### 8. Verification Steps
```bash
# Check if all tables are created
npx prisma studio

# Test database queries
npm run dev

# Verify tRPC endpoints work correctly
```

## Expected Outcomes

After completion, the database should have:
- ✅ **Fresh migration** with current schema
- ✅ **100+ realistic users** across all roles
- ✅ **50+ teams** with proper assignments
- ✅ **20+ venues** with level mappings
- ✅ **Active tournaments** ready for testing
- ✅ **Sample matches** and verification data
- ✅ **Working tRPC queries** for all volunteer operations

## Error Handling

If you encounter:
- **Connection issues**: Check `.env` DATABASE_URL
- **Migration conflicts**: Use `--force-reset` flag
- **Seed failures**: Check foreign key constraints and data validity
- **Permission errors**: Verify Supabase database permissions

## Final Deliverables

Provide:
1. **Migration status** confirmation
2. **Seed data summary** (counts per entity type)
3. **Sample queries** to verify data integrity
4. **Test user credentials** for different roles
5. **Any issues encountered** and resolutions

## Notes
- The migrations folder has already been deleted
- Current schema in `/prisma/schema.prisma` is the source of truth
- Focus on creating realistic tournament scenarios for proper testing
- Include both English and Hindi names for authenticity