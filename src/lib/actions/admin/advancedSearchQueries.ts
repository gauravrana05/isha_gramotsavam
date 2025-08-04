'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { optimizeTeamDocument, optimizePlayerDocument } from '@/lib/utils/documentOptimizer';

// Advanced search schemas
const GlobalSearchFiltersSchema = z.object({
  // Search parameters
  query: z.string().min(1).max(100),
  searchTypes: z.array(z.enum(['teams', 'players', 'venues', 'matches'])).min(1),
  
  // Result limits per type
  maxResults: z.number().min(1).max(50).default(10),
  
  // Geographic filters
  district: z.string().optional(),
  panchayat: z.string().optional(),
  
  // Context filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  status: z.enum(['active', 'verified', 'all']).default('all'),
  
  // Search options
  exactMatch: z.boolean().default(false),
  includeInactive: z.boolean().default(false)
});

const SmartFiltersSchema = z.object({
  // Entity type
  entityType: z.enum(['teams', 'players', 'venues']),
  
  // Dynamic filter criteria
  filterCriteria: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['equals', 'contains', 'starts_with', 'greater_than', 'less_than', 'in', 'between']),
    value: z.union([z.string(), z.number(), z.array(z.string()), z.object({
      min: z.union([z.string(), z.number()]),
      max: z.union([z.string(), z.number()])
    })]),
    required: z.boolean().default(true)
  })).max(10),
  
  // Result options
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Output options
  includeRelated: z.boolean().default(false),
  fieldsToInclude: z.array(z.string()).optional()
});

const StaticAnalysisFiltersSchema = z.object({
  analysisType: z.enum(['geographic_distribution', 'sport_popularity', 'age_demographics', 'verification_bottlenecks', 'tournament_progress']),
  
  // Geographic scope
  district: z.string().optional(),
  panchayat: z.string().optional(),
  
  // Time range
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  
  // Additional filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Analysis options
  includeComparisons: z.boolean().default(true),
  groupBy: z.enum(['day', 'week', 'month', 'sport', 'district', 'panchayat']).optional()
});

export async function performGlobalSearch(
  filters: z.infer<typeof GlobalSearchFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = GlobalSearchFiltersSchema.parse(filters);
    const { query, searchTypes, maxResults } = validatedFilters;
    
    const searchQuery = validatedFilters.exactMatch ? query : query.toLowerCase();
    const results: any = {
      teams: [],
      players: [],
      venues: [],
      matches: [],
      totalResults: 0,
      searchTime: Date.now()
    };

    // Execute searches in parallel for performance
    const searchPromises: Promise<any>[] = [];

    if (searchTypes.includes('teams')) {
      searchPromises.push(searchTeams(searchQuery, validatedFilters, maxResults));
    }

    if (searchTypes.includes('players')) {
      searchPromises.push(searchPlayers(searchQuery, validatedFilters, maxResults));
    }

    if (searchTypes.includes('venues')) {
      searchPromises.push(searchVenues(searchQuery, validatedFilters, maxResults));
    }

    if (searchTypes.includes('matches')) {
      searchPromises.push(searchMatches(searchQuery, validatedFilters, maxResults));
    }

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process results
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const searchType = searchTypes[index];
        results[searchType] = result.value;
        results.totalResults += result.value.length;
      }
    });

    results.searchTime = Date.now() - results.searchTime;

    return {
      success: true,
      results,
      meta: {
        query: searchQuery,
        searchTypes,
        filters: validatedFilters,
        performance: {
          searchTime: results.searchTime,
          resultsPerType: searchTypes.reduce((acc, type) => {
            acc[type] = results[type].length;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    };

  } catch (error) {
    console.error('Error in global search:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Global search failed'
    };
  }
}

export async function performSmartFiltering(
  filters: z.infer<typeof SmartFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = SmartFiltersSchema.parse(filters);
    const { entityType, filterCriteria, limit, offset } = validatedFilters;

    // Build dynamic query based on filter criteria
    let baseQuery = getBaseQueryForEntity(entityType);
    const appliedFilters: string[] = [];
    const clientSideFilters: any[] = [];

    // Process filter criteria
    filterCriteria.forEach((criterion, index) => {
      const { field, operator, value, required } = criterion;

      try {
        // Apply database-level filters where possible
        if (operator === 'equals' && typeof value === 'string') {
          baseQuery = baseQuery.where(field, '==', value);
          appliedFilters.push(`${field}_equals`);
        } else if (operator === 'greater_than' && typeof value === 'number') {
          baseQuery = baseQuery.where(field, '>', value);
          appliedFilters.push(`${field}_gt`);
        } else if (operator === 'less_than' && typeof value === 'number') {
          baseQuery = baseQuery.where(field, '<', value);
          appliedFilters.push(`${field}_lt`);
        } else if (operator === 'in' && Array.isArray(value)) {
          baseQuery = baseQuery.where(field, 'in', value.slice(0, 10)); // Firestore limit
          appliedFilters.push(`${field}_in`);
        } else {
          // Add to client-side filters for complex operations
          clientSideFilters.push(criterion);
        }
      } catch (error) {
        // If database filter fails, fall back to client-side
        clientSideFilters.push(criterion);
      }
    });

    // Execute query with buffer for client-side filtering
    const queryLimit = Math.min(limit * (clientSideFilters.length > 0 ? 3 : 1), 300);
    const snapshot = await baseQuery.limit(queryLimit).offset(offset).get();

    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    // Apply client-side filters
    clientSideFilters.forEach(criterion => {
      results = applyClientSideFilter(results, criterion);
    });

    // Apply pagination after client-side filtering
    const paginatedResults = results.slice(0, limit);

    // Optimize documents based on entity type
    const optimizedResults = paginatedResults.map(result => {
      switch (entityType) {
        case 'teams':
          return optimizeTeamDocument(result);
        case 'players':
          return optimizePlayerDocument(result);
        default:
          return result;
      }
    });

    // Include related data if requested
    let enhancedResults = optimizedResults;
    if (validatedFilters.includeRelated) {
      enhancedResults = await enhanceWithRelatedData(optimizedResults, entityType);
    }

    return {
      success: true,
      results: enhancedResults,
      pagination: {
        limit,
        offset,
        count: enhancedResults.length,
        total: results.length,
        hasMore: enhancedResults.length === limit
      },
      meta: {
        entityType,
        appliedFilters,
        clientSideFilters: clientSideFilters.length,
        queryOptimized: appliedFilters.length > 0
      }
    };

  } catch (error) {
    console.error('Error in smart filtering:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Smart filtering failed'
    };
  }
}

export async function performStatisticalAnalysis(
  filters: z.infer<typeof StaticAnalysisFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = StaticAnalysisFiltersSchema.parse(filters);
    const { analysisType } = validatedFilters;

    let analysisResult;

    switch (analysisType) {
      case 'geographic_distribution':
        analysisResult = await analyzeGeographicDistribution(validatedFilters);
        break;
      case 'sport_popularity':
        analysisResult = await analyzeSportPopularity(validatedFilters);
        break;
      case 'age_demographics':
        analysisResult = await analyzeAgeDemographics(validatedFilters);
        break;
      case 'verification_bottlenecks':
        analysisResult = await analyzeVerificationBottlenecks(validatedFilters);
        break;
      case 'tournament_progress':
        analysisResult = await analyzeTournamentProgress(validatedFilters);
        break;
      default:
        throw new Error('Invalid analysis type');
    }

    return {
      success: true,
      analysis: analysisResult,
      meta: {
        analysisType,
        filters: validatedFilters,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error in statistical analysis:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Statistical analysis failed'
    };
  }
}

// Helper functions for search implementations
async function searchTeams(query: string, filters: any, maxResults: number) {
  let teamsQuery = adminDb.collection('teams');
  
  // Apply base filters
  if (filters.district) {
    teamsQuery = teamsQuery.where('district', '==', filters.district);
  }
  if (filters.sportName) {
    teamsQuery = teamsQuery.where('sportName', '==', filters.sportName);
  }
  if (filters.status !== 'all') {
    teamsQuery = teamsQuery.where('status', '==', filters.status);
  }

  const snapshot = await teamsQuery.limit(maxResults * 2).get();
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'team',
      relevance: calculateRelevance(query, [doc.data().name, doc.data().captainProfile?.name])
    }))
    .filter(team => 
      team.name?.toLowerCase().includes(query) ||
      team.captainProfile?.name?.toLowerCase().includes(query)
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map(optimizeTeamDocument);
}

async function searchPlayers(query: string, filters: any, maxResults: number) {
  let playersQuery = adminDb.collectionGroup('players');
  playersQuery = playersQuery.where('isDeleted', '!=', true);
  
  const snapshot = await playersQuery.limit(maxResults * 3).get();
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'player',
      relevance: calculateRelevance(query, [doc.data().name, doc.data().phone])
    }))
    .filter(player => 
      player.name?.toLowerCase().includes(query) ||
      player.phone?.includes(query)
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map(optimizePlayerDocument);
}

async function searchVenues(query: string, filters: any, maxResults: number) {
  let venuesQuery = adminDb.collection('venues');
  
  if (filters.district) {
    venuesQuery = venuesQuery.where('district', '==', filters.district);
  }

  const snapshot = await venuesQuery.limit(maxResults * 2).get();
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'venue',
      relevance: calculateRelevance(query, [doc.data().name, doc.data().address])
    }))
    .filter(venue => 
      venue.name?.toLowerCase().includes(query) ||
      venue.address?.toLowerCase().includes(query)
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

async function searchMatches(query: string, filters: any, maxResults: number) {
  const matchesQuery = adminDb.collection('matches');
  const snapshot = await matchesQuery.limit(maxResults * 2).get();
  
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'match',
      relevance: calculateRelevance(query, [
        doc.data().team1?.teamName,
        doc.data().team2?.teamName,
        doc.data().venueName
      ])
    }))
    .filter(match => 
      match.team1?.teamName?.toLowerCase().includes(query) ||
      match.team2?.teamName?.toLowerCase().includes(query) ||
      match.venueName?.toLowerCase().includes(query)
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

function calculateRelevance(query: string, fields: (string | undefined)[]): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  fields.forEach(field => {
    if (!field) return;
    const fieldLower = field.toLowerCase();
    
    if (fieldLower === queryLower) score += 10;
    else if (fieldLower.startsWith(queryLower)) score += 7;
    else if (fieldLower.includes(queryLower)) score += 3;
  });
  
  return score;
}

function getBaseQueryForEntity(entityType: string) {
  switch (entityType) {
    case 'teams':
      return adminDb.collection('teams');
    case 'players':
      return adminDb.collectionGroup('players').where('isDeleted', '!=', true);
    case 'venues':
      return adminDb.collection('venues');
    default:
      throw new Error('Invalid entity type');
  }
}

function applyClientSideFilter(results: any[], criterion: any): any[] {
  const { field, operator, value } = criterion;
  
  return results.filter(item => {
    const fieldValue = getNestedValue(item, field);
    
    switch (operator) {
      case 'contains':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().startsWith(String(value).toLowerCase());
      case 'between':
        const range = value as { min: number | string, max: number | string };
        return fieldValue >= range.min && fieldValue <= range.max;
      default:
        return true;
    }
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function enhanceWithRelatedData(results: any[], entityType: string): Promise<any[]> {
  // Add related data based on entity type
  switch (entityType) {
    case 'teams':
      return await enhanceTeamsWithPlayers(results);
    case 'players':
      return await enhancePlayersWithTeams(results);
    default:
      return results;
  }
}

async function enhanceTeamsWithPlayers(teams: any[]): Promise<any[]> {
  const teamIds = teams.map(team => team.id);
  const playersMap = new Map();
  
  for (const teamId of teamIds) {
    const playersSnapshot = await adminDb
      .collection('teams').doc(teamId)
      .collection('players')
      .where('isDeleted', '!=', true)
      .limit(5)
      .get();
    
    playersMap.set(teamId, playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...optimizePlayerDocument(doc.data())
    })));
  }
  
  return teams.map(team => ({
    ...team,
    players: playersMap.get(team.id) || []
  }));
}

async function enhancePlayersWithTeams(players: any[]): Promise<any[]> {
  const teamIds = [...new Set(players.map(player => player.teamId))];
  const teamsMap = new Map();
  
  if (teamIds.length > 0) {
    const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
    const teamDocs = await adminDb.getAll(...teamRefs);
    
    teamDocs.forEach(doc => {
      if (doc.exists()) {
        teamsMap.set(doc.id, optimizeTeamDocument(doc.data()));
      }
    });
  }
  
  return players.map(player => ({
    ...player,
    team: teamsMap.get(player.teamId) || null
  }));
}

// Statistical analysis helper functions
async function analyzeGeographicDistribution(filters: any) {
  const teamsQuery = adminDb.collection('teams');
  const snapshot = await teamsQuery.get();
  
  const distribution = {
    byDistrict: {} as Record<string, number>,
    byPanchayat: {} as Record<string, number>,
    total: snapshot.size
  };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const district = data.district || 'Unknown';
    const panchayat = data.panchayat || 'Unknown';
    
    distribution.byDistrict[district] = (distribution.byDistrict[district] || 0) + 1;
    distribution.byPanchayat[panchayat] = (distribution.byPanchayat[panchayat] || 0) + 1;
  });
  
  return distribution;
}

async function analyzeSportPopularity(filters: any) {
  const teamsQuery = adminDb.collection('teams');
  const snapshot = await teamsQuery.get();
  
  const popularity = {
    bySport: {} as Record<string, { teams: number, players: number }>,
    total: snapshot.size
  };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const sport = data.sportName || 'Unknown';
    
    if (!popularity.bySport[sport]) {
      popularity.bySport[sport] = { teams: 0, players: 0 };
    }
    
    popularity.bySport[sport].teams++;
    popularity.bySport[sport].players += data.currentPlayers || 0;
  });
  
  return popularity;
}

async function analyzeAgeDemographics(filters: any) {
  const playersQuery = adminDb.collectionGroup('players').where('isDeleted', '!=', true);
  const snapshot = await playersQuery.get();
  
  const demographics = {
    ageGroups: {
      '14-20': 0,
      '21-30': 0,
      '31-40': 0,
      '41-50': 0,
      '51-60': 0,
      unknown: 0
    },
    byGender: { M: 0, F: 0, unknown: 0 },
    total: snapshot.size,
    averageAge: 0
  };
  
  let totalAge = 0;
  let ageCount = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const age = data.age;
    const gender = data.gender || 'unknown';
    
    demographics.byGender[gender] = (demographics.byGender[gender] || 0) + 1;
    
    if (age) {
      totalAge += age;
      ageCount++;
      
      if (age >= 14 && age <= 20) demographics.ageGroups['14-20']++;
      else if (age >= 21 && age <= 30) demographics.ageGroups['21-30']++;
      else if (age >= 31 && age <= 40) demographics.ageGroups['31-40']++;
      else if (age >= 41 && age <= 50) demographics.ageGroups['41-50']++;
      else if (age >= 51 && age <= 60) demographics.ageGroups['51-60']++;
    } else {
      demographics.ageGroups.unknown++;
    }
  });
  
  demographics.averageAge = ageCount > 0 ? Math.round((totalAge / ageCount) * 100) / 100 : 0;
  
  return demographics;
}

async function analyzeVerificationBottlenecks(filters: any) {
  const teamsQuery = adminDb.collection('teams').where('status', '==', 'submitted');
  const snapshot = await teamsQuery.get();
  
  const bottlenecks = {
    totalInQueue: snapshot.size,
    byTimeInQueue: {
      '0-3 days': 0,
      '4-7 days': 0,
      '8-14 days': 0,
      '15+ days': 0
    },
    avgProcessingTime: 0,
    bottleneckSports: {} as Record<string, number>
  };
  
  const now = Date.now();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const submittedAt = data.submittedAt?.toMillis() || now;
    const daysInQueue = Math.ceil((now - submittedAt) / (1000 * 60 * 60 * 24));
    
    if (daysInQueue <= 3) bottlenecks.byTimeInQueue['0-3 days']++;
    else if (daysInQueue <= 7) bottlenecks.byTimeInQueue['4-7 days']++;
    else if (daysInQueue <= 14) bottlenecks.byTimeInQueue['8-14 days']++;
    else bottlenecks.byTimeInQueue['15+ days']++;
    
    const sport = data.sportName || 'Unknown';
    bottlenecks.bottleneckSports[sport] = (bottlenecks.bottleneckSports[sport] || 0) + 1;
  });
  
  return bottlenecks;
}

async function analyzeTournamentProgress(filters: any) {
  const [fixturesSnapshot, matchesSnapshot] = await Promise.all([
    adminDb.collection('fixtures').get(),
    adminDb.collection('matches').get()
  ]);
  
  const progress = {
    fixtures: {
      total: fixturesSnapshot.size,
      byLevel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    },
    matches: {
      total: matchesSnapshot.size,
      completed: 0,
      inProgress: 0,
      scheduled: 0
    },
    overallProgress: 0
  };
  
  fixturesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const level = data.level || 'cluster';
    const status = data.status || 'draft';
    
    progress.fixtures.byLevel[level] = (progress.fixtures.byLevel[level] || 0) + 1;
    progress.fixtures.byStatus[status] = (progress.fixtures.byStatus[status] || 0) + 1;
  });
  
  matchesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'scheduled';
    
    if (status === 'completed') progress.matches.completed++;
    else if (status === 'in_progress') progress.matches.inProgress++;
    else progress.matches.scheduled++;
  });
  
  progress.overallProgress = progress.matches.total > 0 ? 
    Math.round((progress.matches.completed / progress.matches.total) * 100) : 0;
  
  return progress;
}