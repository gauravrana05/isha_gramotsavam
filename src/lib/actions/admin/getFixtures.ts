'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

// Input validation schemas
const GetFixturesSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  status: z.enum(['draft', 'teams_assigned', 'in_progress', 'completed', 'all']).default('all'),
  level: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  venueId: z.string().optional(),
  sportName: z.string().optional()
});

const GetFixtureStatsSchema = z.object({
  venueId: z.string().optional(),
  level: z.enum(['cluster', 'division', 'final']).optional()
});

interface FixtureData {
  id: string;
  name?: string;
  level: string;
  status: string;
  sportName: string;
  genderCategory: string;
  venueId: string;
  venueName?: string;
  assignedTeams: string[];
  totalMatches: number;
  completedMatches: number;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

interface FixtureStats {
  totalFixtures: number;
  totalMatches: number;
  byStatus: {
    draft: number;
    teams_assigned: number;
    in_progress: number;
    completed: number;
  };
  byLevel: {
    cluster: number;
    division: number;
    final: number;
  };
}

export async function getFixtures(params: z.infer<typeof GetFixturesSchema>) {
  try {
    // Validate input
    const validatedParams = GetFixturesSchema.parse(params);
    
    // Build query
    let query = adminDb.collection('fixtures');
    
    // Add filters
    if (validatedParams.status !== 'all') {
      query = query.where('status', '==', validatedParams.status);
    }
    
    if (validatedParams.level !== 'all') {
      query = query.where('level', '==', validatedParams.level);
    }
    
    if (validatedParams.venueId) {
      query = query.where('venueId', '==', validatedParams.venueId);
    }
    
    if (validatedParams.sportName) {
      query = query.where('sportName', '==', validatedParams.sportName);
    }
    
    // Add ordering and pagination
    const fixturesSnapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(validatedParams.limit)
      .offset(validatedParams.offset)
      .get();
    
    const fixtures: FixtureData[] = [];
    
    for (const doc of fixturesSnapshot.docs) {
      const fixtureData = doc.data();
      
      // Count matches for this fixture
      let totalMatches = 0;
      let completedMatches = 0;
      
      try {
        const matchesSnapshot = await adminDb
          .collection('matches')
          .where('fixtureId', '==', doc.id)
          .get();
        
        totalMatches = matchesSnapshot.size;
        completedMatches = matchesSnapshot.docs.filter(
          matchDoc => matchDoc.data().status === 'completed'
        ).length;
      } catch (error) {
        console.error(`Error counting matches for fixture ${doc.id}:`, error);
      }
      
      // Serialize timestamps
      fixtures.push({
        id: doc.id,
        name: fixtureData.name,
        level: fixtureData.level || 'unknown',
        status: fixtureData.status || 'draft',
        sportName: fixtureData.sportName || 'Unknown Sport',
        genderCategory: fixtureData.genderCategory || 'mixed',
        venueId: fixtureData.venueId || '',
        venueName: fixtureData.venueName,
        assignedTeams: fixtureData.assignedTeams || [],
        totalMatches,
        completedMatches,
        createdAt: fixtureData?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: fixtureData?.updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: fixtureData?.completedAt?.toDate?.()?.toISOString() || null
      });
    }
    
    return {
      success: true,
      fixtures,
      hasMore: fixtures.length === validatedParams.limit
    };

  } catch (error) {
    console.error('Error fetching fixtures:', error);
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        fixtures: [],
        hasMore: false
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch fixtures',
      fixtures: [],
      hasMore: false
    };
  }
}

export async function getFixtureStats(params: z.infer<typeof GetFixtureStatsSchema> = {}) {
  try {
    // Validate input
    const validatedParams = GetFixtureStatsSchema.parse(params);
    
    // Build base queries
    let fixturesQuery = adminDb.collection('fixtures');
    let matchesQuery = adminDb.collection('matches');
    
    // Apply filters if provided
    if (validatedParams.venueId) {
      fixturesQuery = fixturesQuery.where('venueId', '==', validatedParams.venueId);
      matchesQuery = matchesQuery.where('venueId', '==', validatedParams.venueId);
    }
    
    if (validatedParams.level) {
      fixturesQuery = fixturesQuery.where('level', '==', validatedParams.level);
    }
    
    // Execute queries in parallel
    const [fixturesSnapshot, matchesSnapshot] = await Promise.all([
      fixturesQuery.get(),
      matchesQuery.get()
    ]);
    
    const stats: FixtureStats = {
      totalFixtures: fixturesSnapshot.size,
      totalMatches: matchesSnapshot.size,
      byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
      byLevel: { cluster: 0, division: 0, final: 0 }
    };
    
    // Calculate stats from fixtures
    fixturesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      const status = data.status as keyof typeof stats.byStatus;
      if (status && stats.byStatus.hasOwnProperty(status)) {
        stats.byStatus[status]++;
      }
      
      // Count by level
      const level = data.level as keyof typeof stats.byLevel;
      if (level && stats.byLevel.hasOwnProperty(level)) {
        stats.byLevel[level]++;
      }
    });
    
    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('Error fetching fixture stats:', error);
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        stats: {
          totalFixtures: 0,
          totalMatches: 0,
          byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
          byLevel: { cluster: 0, division: 0, final: 0 }
        }
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch fixture stats',
      stats: {
        totalFixtures: 0,
        totalMatches: 0,
        byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
        byLevel: { cluster: 0, division: 0, final: 0 }
      }
    };
  }
}

export async function getFixtureDetails(fixtureId: string, includeMatches: boolean = true) {
  try {
    if (!fixtureId) {
      return { success: false, error: 'Fixture ID is required' };
    }

    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    
    if (!fixtureDoc.exists) {
      return { 
        success: false, 
        error: 'Fixture not found',
        fixture: null 
      };
    }
    
    const fixtureData = fixtureDoc.data();
    
    // Get team details if needed
    const teamIds = [...new Set([
      ...(fixtureData?.assignedTeams || []),
      ...(fixtureData?.bracket?.matches || []).flatMap((match: any) => 
        [match.team1Id, match.team2Id].filter(Boolean)
      )
    ])];
    
    const teams: { [key: string]: any } = {};
    if (teamIds.length > 0) {
      const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
      const teamDocs = await adminDb.getAll(...teamRefs);
      
      teamDocs.forEach(doc => {
        if (doc.exists) {
          const teamData = doc.data();
          teams[doc.id] = {
            id: doc.id,
            name: teamData?.name,
            captainProfile: teamData?.captainProfile,
            panchayat: teamData?.panchayat,
            district: teamData?.district
          };
        }
      });
    }
    
    // Get matches if requested
    let matches: any[] = [];
    if (includeMatches) {
      const matchesSnapshot = await adminDb
        .collection('matches')
        .where('fixtureId', '==', fixtureId)
        .orderBy('scheduledAt', 'asc')
        .get();
      
      matches = matchesSnapshot.docs.map(doc => {
        const matchData = doc.data();
        return {
          id: doc.id,
          ...matchData,
          scheduledAt: matchData?.scheduledAt?.toDate?.()?.toISOString() || null,
          createdAt: matchData?.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: matchData?.updatedAt?.toDate?.()?.toISOString() || null
        };
      });
    }
    
    const serializedFixture = {
      id: fixtureId,
      ...fixtureData,
      createdAt: fixtureData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: fixtureData?.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: fixtureData?.completedAt?.toDate?.()?.toISOString() || null
    };

    return {
      success: true,
      fixture: serializedFixture,
      teams,
      matches
    };
    
  } catch (error) {
    console.error('Error getting fixture details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fixture: null 
    };
  }
}