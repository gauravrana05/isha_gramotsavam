'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

// Filter schemas for admin dashboard queries
const AdminDashboardFiltersSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  district: z.string().optional(),
  sportName: z.string().optional(),
  level: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  includeDetailed: z.boolean().default(false),
  refreshCache: z.boolean().default(false)
});

const TournamentOverviewFiltersSchema = z.object({
  level: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  venueId: z.string().optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'all']).default('all'),
  sportName: z.string().optional()
});

export async function getAdminDashboardOverview(
  filters: z.infer<typeof AdminDashboardFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = AdminDashboardFiltersSchema.parse(filters);
    
    // Execute all queries in parallel for maximum performance
    const [
      teamsOverview,
      playersOverview,
      verificationOverview,
      venuesOverview,
      matchesOverview,
      recentActivity
    ] = await Promise.all([
      getTeamsOverview(validatedFilters),
      getPlayersOverview(validatedFilters),
      getVerificationOverview(validatedFilters),
      getVenuesOverview(validatedFilters),
      getMatchesOverview(validatedFilters),
      getRecentActivity(validatedFilters)
    ]);
    
    // Calculate system health metrics
    const systemHealth = calculateSystemHealth({
      teams: teamsOverview,
      players: playersOverview,
      verification: verificationOverview,
      venues: venuesOverview,
      matches: matchesOverview
    });
    
    // Generate actionable insights
    const insights = generateDashboardInsights({
      teams: teamsOverview,
      players: playersOverview,
      verification: verificationOverview,
      venues: venuesOverview,
      matches: matchesOverview
    });
    
    return {
      success: true,
      overview: {
        teams: teamsOverview,
        players: playersOverview,
        verification: verificationOverview,
        venues: venuesOverview,
        matches: matchesOverview,
        systemHealth,
        insights,
        recentActivity: validatedFilters.includeDetailed ? recentActivity : null
      },
      meta: {
        appliedFilters: Object.entries(validatedFilters)
          .filter(([_, value]) => value !== undefined && value !== 'all' && value !== false)
          .map(([key, _]) => key),
        generatedAt: new Date().toISOString(),
        refreshCache: validatedFilters.refreshCache
      }
    };

  } catch (error) {
    console.error('Error in getAdminDashboardOverview:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard overview'
    };
  }
}

export async function getTournamentOverview(
  filters: z.infer<typeof TournamentOverviewFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = TournamentOverviewFiltersSchema.parse(filters);
    
    // Build fixtures query
    let fixturesQuery = adminDb.collection('fixtures');
    
    if (validatedFilters.level !== 'all') {
      fixturesQuery = fixturesQuery.where('level', '==', validatedFilters.level);
    }
    
    if (validatedFilters.venueId) {
      fixturesQuery = fixturesQuery.where('venueId', '==', validatedFilters.venueId);
    }
    
    if (validatedFilters.status !== 'all') {
      fixturesQuery = fixturesQuery.where('status', '==', validatedFilters.status);
    }
    
    if (validatedFilters.sportName) {
      fixturesQuery = fixturesQuery.where('sportName', '==', validatedFilters.sportName);
    }
    
    // Execute queries in parallel
    const [fixturesSnapshot, matchesSnapshot, venuesSnapshot] = await Promise.all([
      fixturesQuery.get(),
      adminDb.collection('matches').get(),
      adminDb.collection('venues').where('isActive', '==', true).get()
    ]);
    
    // Process fixtures data
    const fixturesData = fixturesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null
    }));
    
    // Process matches data
    const allMatches = matchesSnapshot.docs.map(doc => doc.data());
    
    // Calculate tournament statistics
    const tournamentStats = {
      fixtures: {
        total: fixturesData.length,
        byLevel: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        bySport: {} as Record<string, number>,
        byVenue: {} as Record<string, number>
      },
      matches: {
        total: allMatches.length,
        completed: allMatches.filter(m => m.status === 'completed').length,
        inProgress: allMatches.filter(m => m.status === 'in_progress').length,
        scheduled: allMatches.filter(m => m.status === 'scheduled' || m.status === 'ready').length,
        byRound: {} as Record<string, number>
      },
      venues: {
        total: venuesSnapshot.size,
        active: venuesSnapshot.docs.filter(doc => doc.data().isActive).length,
        utilizationRate: 0
      },
      progression: {
        clusterToDiv: 0,
        divToFinal: 0,
        completed: 0
      }
    };
    
    // Aggregate fixture statistics
    fixturesData.forEach(fixture => {
      // By level
      const level = fixture.level || 'unknown';
      tournamentStats.fixtures.byLevel[level] = (tournamentStats.fixtures.byLevel[level] || 0) + 1;
      
      // By status
      const status = fixture.status || 'draft';
      tournamentStats.fixtures.byStatus[status] = (tournamentStats.fixtures.byStatus[status] || 0) + 1;
      
      // By sport
      const sport = fixture.sportName || 'unknown';
      tournamentStats.fixtures.bySport[sport] = (tournamentStats.fixtures.bySport[sport] || 0) + 1;
      
      // By venue
      const venue = fixture.venueName || fixture.venueId || 'unknown';
      tournamentStats.fixtures.byVenue[venue] = (tournamentStats.fixtures.byVenue[venue] || 0) + 1;
    });
    
    // Aggregate match statistics
    allMatches.forEach(match => {
      const round = match.roundName || 'Unknown';
      tournamentStats.matches.byRound[round] = (tournamentStats.matches.byRound[round] || 0) + 1;
    });
    
    // Calculate venue utilization
    if (venuesSnapshot.size > 0) {
      const activeVenues = Object.keys(tournamentStats.fixtures.byVenue).length;
      tournamentStats.venues.utilizationRate = Math.round((activeVenues / venuesSnapshot.size) * 100);
    }
    
    // Calculate progression statistics
    const completedFixtures = fixturesData.filter(f => f.status === 'completed');
    tournamentStats.progression.completed = completedFixtures.length;
    
    // Count teams that advanced from cluster to division
    const clusterCompletedFixtures = completedFixtures.filter(f => f.level === 'cluster');
    tournamentStats.progression.clusterToDiv = clusterCompletedFixtures.reduce((count, fixture) => {
      return count + (fixture.bracket?.winners?.length || 0);
    }, 0);
    
    // Count teams that advanced from division to final
    const divisionCompletedFixtures = completedFixtures.filter(f => f.level === 'division');
    tournamentStats.progression.divToFinal = divisionCompletedFixtures.reduce((count, fixture) => {
      return count + (fixture.bracket?.winners?.length || 0);
    }, 0);
    
    // Get upcoming critical matches
    const upcomingMatches = allMatches
      .filter(match => match.status === 'ready' || match.status === 'scheduled')
      .sort((a, b) => {
        const aTime = a.scheduledAt?.toDate?.()?.getTime() || 0;
        const bTime = b.scheduledAt?.toDate?.()?.getTime() || 0;
        return aTime - bTime;
      })
      .slice(0, 10)
      .map(match => ({
        id: match.matchId || match.id,
        roundName: match.roundName,
        team1: match.team1?.teamName || 'TBD',
        team2: match.team2?.teamName || 'TBD',
        venue: match.venueName,
        scheduledAt: match.scheduledAt?.toDate?.()?.toISOString() || null,
        status: match.status
      }));
    
    // Generate tournament insights
    const tournamentInsights = generateTournamentInsights(tournamentStats, fixturesData);
    
    return {
      success: true,
      tournament: {
        stats: tournamentStats,
        upcomingMatches,
        insights: tournamentInsights,
        summary: {
          overallProgress: Math.round((tournamentStats.matches.completed / Math.max(tournamentStats.matches.total, 1)) * 100),
          activeFixtures: tournamentStats.fixtures.byStatus.in_progress || 0,
          completedTournaments: tournamentStats.fixtures.byStatus.completed || 0,
          teamsAdvanced: tournamentStats.progression.clusterToDiv + tournamentStats.progression.divToFinal
        }
      },
      appliedFilters: Object.entries(validatedFilters)
        .filter(([_, value]) => value !== undefined && value !== 'all')
        .map(([key, _]) => key)
    };

  } catch (error) {
    console.error('Error in getTournamentOverview:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tournament overview'
    };
  }
}

// Helper functions for dashboard data aggregation
async function getTeamsOverview(filters: any) {
  try {
    let teamsQuery = adminDb.collection('teams');
    
    if (filters.district) {
      teamsQuery = teamsQuery.where('district', '==', filters.district);
    }
    
    if (filters.sportName) {
      teamsQuery = teamsQuery.where('sportName', '==', filters.sportName);
    }
    
    if (filters.dateRange) {
      teamsQuery = teamsQuery
        .where('createdAt', '>=', new Date(filters.dateRange.start))
        .where('createdAt', '<=', new Date(filters.dateRange.end));
    }
    
    const teamsSnapshot = await teamsQuery.get();
  
  const overview = {
    total: teamsSnapshot.size,
    byStatus: {} as Record<string, number>,
    bySport: {} as Record<string, number>,
    byDistrict: {} as Record<string, number>,
    byGenderCategory: {} as Record<string, number>,
    averagePlayersPerTeam: 0,
    totalPlayers: 0,
    completionRate: 0,
    verificationRate: 0
  };
  
  let totalPlayerCount = 0;
  let completeTeams = 0;
  let verifiedTeams = 0;
  
  teamsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Count by status
    const status = data.status || 'draft';
    overview.byStatus[status] = (overview.byStatus[status] || 0) + 1;
    
    // Count by sport
    const sport = data.sportName || 'unknown';
    overview.bySport[sport] = (overview.bySport[sport] || 0) + 1;
    
    // Count by district
    const district = data.district || 'unknown';
    overview.byDistrict[district] = (overview.byDistrict[district] || 0) + 1;
    
    // Count by gender category
    const gender = data.genderCategory || 'mixed';
    overview.byGenderCategory[gender] = (overview.byGenderCategory[gender] || 0) + 1;
    
    // Calculate metrics
    const currentPlayers = data.currentPlayers || 0;
    const maxPlayers = data.maxPlayers || 6;
    totalPlayerCount += currentPlayers;
    
    if (currentPlayers >= maxPlayers) completeTeams++;
    if (data.verificationStatus === 'verified') verifiedTeams++;
  });
  
  overview.totalPlayers = totalPlayerCount;
  overview.averagePlayersPerTeam = overview.total > 0 ? 
    Math.round((totalPlayerCount / overview.total) * 100) / 100 : 0;
  overview.completionRate = overview.total > 0 ? 
    Math.round((completeTeams / overview.total) * 100) : 0;
  overview.verificationRate = overview.total > 0 ? 
    Math.round((verifiedTeams / overview.total) * 100) : 0;
  
  return overview;
  } catch (error) {
    console.error('Error in getTeamsOverview:', error);
    return {
      total: 0,
      byStatus: {},
      bySport: {},
      byDistrict: {},
      byGenderCategory: {},
      averagePlayersPerTeam: 0,
      totalPlayers: 0,
      completionRate: 0,
      verificationRate: 0
    };
  }
}

async function getPlayersOverview(filters: any) {
  try {
    // Use collection group query for all players
    let playersQuery = adminDb.collectionGroup('players');
    playersQuery = playersQuery.where('isDeleted', '!=', true);
  
  if (filters.dateRange) {
    playersQuery = playersQuery
      .where('addedAt', '>=', new Date(filters.dateRange.start))
      .where('addedAt', '<=', new Date(filters.dateRange.end));
  }
  
  const playersSnapshot = await playersQuery.get();
  
  const overview = {
    total: playersSnapshot.size,
    byVerificationStatus: {} as Record<string, number>,
    byGender: {} as Record<string, number>,
    byAgeGroup: {
      '14-20': 0,
      '21-30': 0,
      '31-40': 0,
      '41-50': 0,
      '51-60': 0,
      unknown: 0
    },
    documentsUploaded: 0,
    documentsVerified: 0,
    averageAge: 0
  };
  
  let totalAge = 0;
  let ageCount = 0;
  
  playersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Verification status
    const verificationStatus = data.verificationStatus || 'pending';
    overview.byVerificationStatus[verificationStatus] = (overview.byVerificationStatus[verificationStatus] || 0) + 1;
    
    // Gender
    const gender = data.gender || 'unknown';
    overview.byGender[gender] = (overview.byGender[gender] || 0) + 1;
    
    // Age groups
    const age = data.age;
    if (age) {
      totalAge += age;
      ageCount++;
      
      if (age >= 14 && age <= 20) overview.byAgeGroup['14-20']++;
      else if (age >= 21 && age <= 30) overview.byAgeGroup['21-30']++;
      else if (age >= 31 && age <= 40) overview.byAgeGroup['31-40']++;
      else if (age >= 41 && age <= 50) overview.byAgeGroup['41-50']++;
      else if (age >= 51 && age <= 60) overview.byAgeGroup['51-60']++;
    } else {
      overview.byAgeGroup.unknown++;
    }
    
    // Document status
    const docs = data.documents || {};
    const hasAllDocs = docs.profilePhoto?.url && docs.aadhaarFront?.url && docs.aadhaarBack?.url;
    const allVerified = docs.profilePhoto?.verified && docs.aadhaarFront?.verified && docs.aadhaarBack?.verified;
    
    if (hasAllDocs) overview.documentsUploaded++;
    if (allVerified) overview.documentsVerified++;
  });
  
  overview.averageAge = ageCount > 0 ? Math.round((totalAge / ageCount) * 100) / 100 : 0;
  
  return overview;
  } catch (error) {
    console.error('Error in getPlayersOverview:', error);
    return {
      total: 0,
      byVerificationStatus: {},
      byGender: {},
      byAgeGroup: {
        '14-20': 0, '21-30': 0, '31-40': 0, '41-50': 0, '51-60': 0, unknown: 0
      },
      documentsUploaded: 0,
      documentsVerified: 0,
      averageAge: 0
    };
  }
}

async function getVerificationOverview(filters: any) {
  try {
    const teamsQuery = adminDb.collection('teams').where('status', '==', 'submitted');
    const teamsSnapshot = await teamsQuery.get();
  
  const overview = {
    totalInQueue: teamsSnapshot.size,
    processed: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    averageProcessingTime: 0,
    backlogDays: 0,
    todayProcessed: 0
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let totalProcessingTime = 0;
  let processedCount = 0;
  let oldestSubmission = Date.now();
  
  teamsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const verificationStatus = data.verificationStatus || 'pending';
    
    if (verificationStatus === 'verified') {
      overview.verified++;
      overview.processed++;
      
      // Calculate processing time
      if (data.submittedAt && data.verifiedAt) {
        const processingTime = data.verifiedAt.toMillis() - data.submittedAt.toMillis();
        totalProcessingTime += processingTime;
        processedCount++;
      }
      
      // Count today's processed
      if (data.verifiedAt && data.verifiedAt.toDate() >= today) {
        overview.todayProcessed++;
      }
    } else if (verificationStatus === 'rejected') {
      overview.rejected++;
      overview.processed++;
      
      if (data.verifiedAt && data.verifiedAt.toDate() >= today) {
        overview.todayProcessed++;
      }
    } else {
      overview.pending++;
      
      // Track oldest submission for backlog calculation
      if (data.submittedAt) {
        oldestSubmission = Math.min(oldestSubmission, data.submittedAt.toMillis());
      }
    }
  });
  
  // Calculate averages
  if (processedCount > 0) {
    overview.averageProcessingTime = Math.round((totalProcessingTime / processedCount) / (1000 * 60 * 60)); // Hours
  }
  
  if (overview.pending > 0) {
    overview.backlogDays = Math.ceil((Date.now() - oldestSubmission) / (1000 * 60 * 60 * 24));
  }
  
  return overview;
  } catch (error) {
    console.error('Error in getVerificationOverview:', error);
    return {
      totalInQueue: 0,
      processed: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      averageProcessingTime: 0,
      backlogDays: 0,
      todayProcessed: 0
    };
  }
}

async function getVenuesOverview(filters: any) {
  try {
    let venuesQuery = adminDb.collection('venues');
  
  if (filters.district) {
    venuesQuery = venuesQuery.where('district', '==', filters.district);
  }
  
  if (filters.level !== 'all') {
    venuesQuery = venuesQuery.where('level', '==', filters.level);
  }
  
  const venuesSnapshot = await venuesQuery.get();
  
  const overview = {
    total: venuesSnapshot.size,
    active: 0,
    byLevel: {} as Record<string, number>,
    byDistrict: {} as Record<string, number>,
    totalCapacity: 0,
    utilizationRate: 0,
    assignedTeams: 0
  };
  
  venuesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    
    if (data.isActive) overview.active++;
    
    const level = data.level || 'unknown';
    overview.byLevel[level] = (overview.byLevel[level] || 0) + 1;
    
    const district = data.district || 'unknown';
    overview.byDistrict[district] = (overview.byDistrict[district] || 0) + 1;
    
    overview.totalCapacity += data.capacity || 0;
    overview.assignedTeams += data.assignedTeams || 0;
  });
  
  overview.utilizationRate = overview.totalCapacity > 0 ? 
    Math.round((overview.assignedTeams / overview.totalCapacity) * 100) : 0;
  
  return overview;
  } catch (error) {
    console.error('Error in getVenuesOverview:', error);
    return {
      total: 0,
      active: 0,
      byLevel: {},
      byDistrict: {},
      totalCapacity: 0,
      utilizationRate: 0,
      assignedTeams: 0
    };
  }
}

async function getMatchesOverview(filters: any) {
  try {
    let matchesQuery = adminDb.collection('matches');
    
    if (filters.level !== 'all') {
      matchesQuery = matchesQuery.where('level', '==', filters.level);
    }
    
    const matchesSnapshot = await matchesQuery.get();
    
    const overview = {
      total: matchesSnapshot.size,
      completed: 0,
      inProgress: 0,
      scheduled: 0,
      byRound: {} as Record<string, number>,
      todayMatches: 0,
      completionRate: 0
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    matchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'scheduled';
      
      if (status === 'completed') overview.completed++;
      else if (status === 'in_progress') overview.inProgress++;
      else overview.scheduled++;
      
      const round = data.roundName || 'Unknown';
      overview.byRound[round] = (overview.byRound[round] || 0) + 1;
      
      // Count today's matches
      if (data.scheduledAt) {
        const matchDate = data.scheduledAt.toDate();
        if (matchDate >= today && matchDate < tomorrow) {
          overview.todayMatches++;
        }
      }
    });
    
    overview.completionRate = overview.total > 0 ? 
      Math.round((overview.completed / overview.total) * 100) : 0;
    
    return overview;
  } catch (error) {
    console.error('Error in getMatchesOverview:', error);
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      scheduled: 0,
      byRound: {},
      todayMatches: 0,
      completionRate: 0
    };
  }
}

async function getRecentActivity(filters: any) {
  try {
    // Get recent activities from multiple collections
    const recentLimit = 20;
    
    const [recentTeams, recentVerifications, recentMatches] = await Promise.all([
      adminDb.collection('teams')
        .orderBy('updatedAt', 'desc')
        .limit(recentLimit)
        .get(),
      adminDb.collectionGroup('verification')
        .where('status', 'in', ['verified', 'rejected'])
        .orderBy('verifiedAt', 'desc')
        .limit(recentLimit)
        .get(),
      adminDb.collection('matches')
        .where('status', '==', 'completed')
        .orderBy('updatedAt', 'desc')
        .limit(recentLimit)
        .get()
    ]);
    
    const activities: any[] = [];
    
    // Process recent team activities
    recentTeams.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        type: 'team',
        action: data.status === 'submitted' ? 'submitted' : 'updated',
        entityId: doc.id,
        entityName: data.name,
        timestamp: data.updatedAt?.toDate?.()?.toISOString() || null,
        details: {
          status: data.status,
          sportName: data.sportName,
          playerCount: data.currentPlayers
        }
      });
    });
    
    // Process verification activities
    recentVerifications.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        type: 'verification',
        action: data.status,
        entityId: data.teamId,
        entityName: `Team verification`,
        timestamp: data.verifiedAt?.toDate?.()?.toISOString() || null,
        details: {
          verifiedBy: data.verifiedBy,
          status: data.status
        }
      });
    });
    
    // Process match activities
    recentMatches.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        type: 'match',
        action: 'completed',
        entityId: doc.id,
        entityName: `${data.team1?.teamName || 'TBD'} vs ${data.team2?.teamName || 'TBD'}`,
        timestamp: data.updatedAt?.toDate?.()?.toISOString() || null,
        details: {
          winner: data.result?.winnerName,
          round: data.roundName,
          venue: data.venueName
        }
      });
    });
    
    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, recentLimit);
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return [];
  }
}

function calculateSystemHealth(data: any) {
  const health = {
    overall: 'healthy' as 'healthy' | 'warning' | 'critical',
    score: 100,
    issues: [] as string[],
    metrics: {
      teamCompletionRate: data.teams.completionRate,
      verificationBacklog: data.verification.backlogDays,
      venueUtilization: data.venues.utilizationRate,
      matchProgress: data.matches.completionRate
    }
  };
  
  // Deduct points for issues
  if (data.teams.completionRate < 70) {
    health.score -= 20;
    health.issues.push('Low team completion rate');
  }
  
  if (data.verification.backlogDays > 7) {
    health.score -= 25;
    health.issues.push('High verification backlog');
  }
  
  if (data.venues.utilizationRate > 90) {
    health.score -= 15;
    health.issues.push('High venue utilization');
  }
  
  if (data.matches.completionRate < 30) {
    health.score -= 20;
    health.issues.push('Low match completion rate');
  }
  
  // Determine overall health
  if (health.score >= 80) health.overall = 'healthy';
  else if (health.score >= 60) health.overall = 'warning';
  else health.overall = 'critical';
  
  return health;
}

function generateDashboardInsights(data: any) {
  const insights = [];
  
  // Team insights
  if (data.teams.verificationRate < 50) {
    insights.push({
      type: 'warning',
      category: 'teams',
      message: `Only ${data.teams.verificationRate}% of teams are verified. Consider expediting verification process.`,
      action: 'Increase verification capacity'
    });
  }
  
  // Verification insights
  if (data.verification.backlogDays > 5) {
    insights.push({
      type: 'alert',
      category: 'verification',
      message: `Verification backlog is ${data.verification.backlogDays} days. Urgent action needed.`,
      action: 'Assign more verification volunteers'
    });
  }
  
  // Player insights
  if (data.players.documentsUploaded / data.players.total < 0.8) {
    insights.push({
      type: 'info',
      category: 'players',
      message: `${Math.round((data.players.documentsUploaded / data.players.total) * 100)}% of players have uploaded all documents.`,
      action: 'Send reminders to incomplete profiles'
    });
  }
  
  // Venue insights
  if (data.venues.utilizationRate > 85) {
    insights.push({
      type: 'warning',
      category: 'venues',
      message: `Venue utilization is ${data.venues.utilizationRate}%. Consider adding more venues.`,
      action: 'Identify additional venues'
    });
  }
  
  return insights;
}

function generateTournamentInsights(stats: any, fixtures: any[]) {
  const insights = [];
  
  // Progress insights
  const overallProgress = (stats.matches.completed / Math.max(stats.matches.total, 1)) * 100;
  
  if (overallProgress < 25) {
    insights.push({
      type: 'info',
      message: `Tournament is ${Math.round(overallProgress)}% complete. Early stage monitoring recommended.`,
      category: 'progress'
    });
  } else if (overallProgress > 75) {
    insights.push({
      type: 'success',
      message: `Tournament is ${Math.round(overallProgress)}% complete. Nearing completion!`,
      category: 'progress'
    });
  }
  
  // Venue insights
  if (stats.venues.utilizationRate < 50) {
    insights.push({
      type: 'warning',
      message: `Venue utilization is only ${stats.venues.utilizationRate}%. Some venues may be underutilized.`,
      category: 'venues'
    });
  }
  
  // Match scheduling insights
  const scheduledMatches = stats.matches.scheduled;
  if (scheduledMatches > stats.matches.completed * 0.5) {
    insights.push({
      type: 'alert',
      message: `${scheduledMatches} matches are scheduled but not yet played. Monitor match execution.`,
      category: 'scheduling'
    });
  }
  
  return insights;
}