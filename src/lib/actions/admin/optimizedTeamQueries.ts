'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { optimizeTeamDocument, optimizePlayerDocument, createPaginatedResponse } from '@/lib/utils/documentOptimizer';

// Comprehensive filter schemas for admin team queries
const AdminTeamFiltersSchema = z.object({
  // Pagination
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  
  // Status filters
  status: z.enum(['draft', 'submitted', 'verified', 'rejected', 'active', 'all']).default('all'),
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'all']).default('all'),
  
  // Geographic filters
  panchayat: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  
  // Sport and category filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Tournament level filters
  currentTournamentLevel: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  venueId: z.string().optional(),
  
  // Date filters
  createdAfter: z.string().optional(), // ISO date string
  createdBefore: z.string().optional(),
  submittedAfter: z.string().optional(),
  submittedBefore: z.string().optional(),
  
  // Team composition filters
  minPlayers: z.number().min(0).optional(),
  maxPlayers: z.number().min(0).optional(),
  isComplete: z.boolean().optional(), // Teams with full player roster
  
  // Search
  searchQuery: z.string().max(100).optional(), // Team name or captain name search
  
  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'submittedAt', 'name', 'currentPlayers']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const AdminTeamStatsFiltersSchema = z.object({
  panchayat: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  currentTournamentLevel: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
});

export async function getAdminTeams(
  filters: z.infer<typeof AdminTeamFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Validate and parse filters
    const validatedFilters = AdminTeamFiltersSchema.parse(filters);
    
    // Build the base query
    let query = adminDb.collection('teams');
    
    // Apply filters dynamically based on available indexes
    const appliedFilters: string[] = [];
    
    // Status filters (most selective first)
    if (validatedFilters.status !== 'all') {
      query = query.where('status', '==', validatedFilters.status);
      appliedFilters.push('status');
    }
    
    if (validatedFilters.verificationStatus !== 'all') {
      query = query.where('verificationStatus', '==', validatedFilters.verificationStatus);
      appliedFilters.push('verificationStatus');
    }
    
    // Geographic filters (high selectivity)
    if (validatedFilters.panchayat) {
      query = query.where('panchayat', '==', validatedFilters.panchayat);
      appliedFilters.push('panchayat');
    } else if (validatedFilters.district) {
      query = query.where('district', '==', validatedFilters.district);
      appliedFilters.push('district');
    } else if (validatedFilters.state) {
      query = query.where('state', '==', validatedFilters.state);
      appliedFilters.push('state');
    }
    
    // Sport filters
    if (validatedFilters.sportName) {
      query = query.where('sportName', '==', validatedFilters.sportName);
      appliedFilters.push('sportName');
    }
    
    if (validatedFilters.genderCategory !== 'all') {
      query = query.where('genderCategory', '==', validatedFilters.genderCategory);
      appliedFilters.push('genderCategory');
    }
    
    // Tournament level filters
    if (validatedFilters.currentTournamentLevel !== 'all') {
      query = query.where('currentTournamentLevel', '==', validatedFilters.currentTournamentLevel);
      appliedFilters.push('currentTournamentLevel');
    }
    
    if (validatedFilters.venueId) {
      query = query.where('clusterVenueId', '==', validatedFilters.venueId);
      appliedFilters.push('venueId');
    }
    
    // Date range filters
    if (validatedFilters.createdAfter) {
      const afterDate = new Date(validatedFilters.createdAfter);
      query = query.where('createdAt', '>=', afterDate);
      appliedFilters.push('createdAfter');
    }
    
    if (validatedFilters.createdBefore) {
      const beforeDate = new Date(validatedFilters.createdBefore);
      query = query.where('createdAt', '<=', beforeDate);
      appliedFilters.push('createdBefore');
    }
    
    // Player count filters (client-side due to index limitations)
    const clientSideFilters = {
      minPlayers: validatedFilters.minPlayers,
      maxPlayers: validatedFilters.maxPlayers,
      isComplete: validatedFilters.isComplete,
      searchQuery: validatedFilters.searchQuery?.toLowerCase()
    };
    
    // Add ordering
    query = query.orderBy(validatedFilters.sortBy, validatedFilters.sortOrder);
    
    // Execute query with pagination buffer for client-side filtering
    const bufferMultiplier = Object.values(clientSideFilters).some(v => v !== undefined) ? 3 : 1;
    const queryLimit = Math.min(validatedFilters.limit * bufferMultiplier, 300);
    
    const teamsSnapshot = await query.limit(queryLimit).offset(validatedFilters.offset).get();
    
    let teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || null
    }));
    
    // Apply client-side filters
    if (clientSideFilters.minPlayers !== undefined) {
      teams = teams.filter(team => (team.currentPlayers || 0) >= clientSideFilters.minPlayers!);
    }
    
    if (clientSideFilters.maxPlayers !== undefined) {
      teams = teams.filter(team => (team.currentPlayers || 0) <= clientSideFilters.maxPlayers!);
    }
    
    if (clientSideFilters.isComplete !== undefined) {
      teams = teams.filter(team => {
        const isComplete = (team.currentPlayers || 0) >= (team.maxPlayers || 6);
        return clientSideFilters.isComplete ? isComplete : !isComplete;
      });
    }
    
    if (clientSideFilters.searchQuery) {
      teams = teams.filter(team => 
        team.name?.toLowerCase().includes(clientSideFilters.searchQuery!) ||
        team.captainProfile?.name?.toLowerCase().includes(clientSideFilters.searchQuery!)
      );
    }
    
    // Apply final pagination after client-side filtering
    const paginatedTeams = teams.slice(0, validatedFilters.limit);
    
    // Optimize team documents for transfer
    const optimizedTeams = paginatedTeams.map(optimizeTeamDocument);
    
    return {
      success: true,
      teams: optimizedTeams,
      pagination: {
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        count: optimizedTeams.length,
        hasMore: optimizedTeams.length === validatedFilters.limit,
        totalAppliedFilters: appliedFilters.length
      },
      appliedFilters,
      meta: {
        queryOptimized: appliedFilters.length > 0,
        clientSideFiltersApplied: Object.values(clientSideFilters).some(v => v !== undefined)
      }
    };

  } catch (error) {
    console.error('Error in getAdminTeams:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        teams: []
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch teams',
      teams: []
    };
  }
}

export async function getAdminTeamDetails(teamId: string, requestingUserId: string) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!teamId) {
      return { success: false, error: 'Team ID is required' };
    }

    // Use transaction to ensure data consistency
    const result = await adminDb.runTransaction(async (transaction) => {
      // Get team document
      const teamRef = adminDb.collection('teams').doc(teamId);
      const teamDoc = await transaction.get(teamRef);
      
      if (!teamDoc.exists) {
        throw new Error('Team not found');
      }
      
      // Get team players efficiently
      const playersRef = adminDb.collection('teams').doc(teamId).collection('players');
      const playersSnapshot = await playersRef.where('isDeleted', '!=', true).get();
      
      const players = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || null,
        verifiedAt: doc.data().verifiedAt?.toDate?.()?.toISOString() || null
      }));
      
      // Get verification record
      const verificationRef = adminDb.collection('teams').doc(teamId).collection('verification').doc('initial');
      const verificationDoc = await transaction.get(verificationRef);
      
      const verification = verificationDoc.exists ? {
        ...verificationDoc.data(),
        createdAt: verificationDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: verificationDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null
      } : null;
      
      // Get team venue assignment if exists
      const venueAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
      const venueAssignmentDoc = await transaction.get(venueAssignmentRef);
      
      const venueAssignment = venueAssignmentDoc.exists ? {
        ...venueAssignmentDoc.data(),
        assignedAt: venueAssignmentDoc.data()?.assignedAt?.toDate?.()?.toISOString() || null,
        updatedAt: venueAssignmentDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null
      } : null;
      
      return {
        team: {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: teamDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
          submittedAt: teamDoc.data().submittedAt?.toDate?.()?.toISOString() || null,
          verifiedAt: teamDoc.data().verifiedAt?.toDate?.()?.toISOString() || null
        },
        players: players.map(optimizePlayerDocument),
        verification,
        venueAssignment
      };
    });

    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('Error getting admin team details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get team details'
    };
  }
}

export async function getAdminTeamStats(
  filters: z.infer<typeof AdminTeamStatsFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = AdminTeamStatsFiltersSchema.parse(filters);
    
    // Build optimized aggregation queries
    let teamsQuery = adminDb.collection('teams');
    
    // Apply filters
    if (validatedFilters.panchayat) {
      teamsQuery = teamsQuery.where('panchayat', '==', validatedFilters.panchayat);
    }
    if (validatedFilters.district) {
      teamsQuery = teamsQuery.where('district', '==', validatedFilters.district);
    }
    if (validatedFilters.sportName) {
      teamsQuery = teamsQuery.where('sportName', '==', validatedFilters.sportName);
    }
    if (validatedFilters.genderCategory !== 'all') {
      teamsQuery = teamsQuery.where('genderCategory', '==', validatedFilters.genderCategory);
    }
    if (validatedFilters.currentTournamentLevel !== 'all') {
      teamsQuery = teamsQuery.where('currentTournamentLevel', '==', validatedFilters.currentTournamentLevel);
    }
    
    // Date range filter
    if (validatedFilters.dateRange) {
      teamsQuery = teamsQuery
        .where('createdAt', '>=', new Date(validatedFilters.dateRange.start))
        .where('createdAt', '<=', new Date(validatedFilters.dateRange.end));
    }
    
    const teamsSnapshot = await teamsQuery.get();
    
    // Calculate comprehensive statistics
    const stats = {
      total: teamsSnapshot.size,
      byStatus: {} as Record<string, number>,
      byVerificationStatus: {} as Record<string, number>,
      bySport: {} as Record<string, number>,
      byGenderCategory: {} as Record<string, number>,
      byPanchayat: {} as Record<string, number>,
      byDistrict: {} as Record<string, number>,
      byTournamentLevel: {} as Record<string, number>,
      playerStats: {
        totalPlayers: 0,
        averagePlayersPerTeam: 0,
        teamsWithFullRoster: 0,
        teamsWithIncompleteRoster: 0
      },
      verificationStats: {
        fullyVerified: 0,
        partiallyVerified: 0,
        unverified: 0,
        rejected: 0
      }
    };
    
    teamsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      const status = data.status || 'draft';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Count by verification status
      const verificationStatus = data.verificationStatus || 'pending';
      stats.byVerificationStatus[verificationStatus] = (stats.byVerificationStatus[verificationStatus] || 0) + 1;
      
      // Count by sport
      const sport = data.sportName || 'unknown';
      stats.bySport[sport] = (stats.bySport[sport] || 0) + 1;
      
      // Count by gender category
      const gender = data.genderCategory || 'mixed';
      stats.byGenderCategory[gender] = (stats.byGenderCategory[gender] || 0) + 1;
      
      // Count by panchayat
      const panchayat = data.panchayat || 'unknown';
      stats.byPanchayat[panchayat] = (stats.byPanchayat[panchayat] || 0) + 1;
      
      // Count by district
      const district = data.district || 'unknown';
      stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
      
      // Count by tournament level
      const level = data.currentTournamentLevel || 'cluster';
      stats.byTournamentLevel[level] = (stats.byTournamentLevel[level] || 0) + 1;
      
      // Player statistics
      const currentPlayers = data.currentPlayers || 0;
      const maxPlayers = data.maxPlayers || 6;
      stats.playerStats.totalPlayers += currentPlayers;
      
      if (currentPlayers >= maxPlayers) {
        stats.playerStats.teamsWithFullRoster++;
      } else {
        stats.playerStats.teamsWithIncompleteRoster++;
      }
      
      // Verification statistics
      if (verificationStatus === 'verified') {
        stats.verificationStats.fullyVerified++;
      } else if (verificationStatus === 'rejected') {
        stats.verificationStats.rejected++;
      } else {
        stats.verificationStats.unverified++;
      }
    });
    
    // Calculate averages
    if (stats.total > 0) {
      stats.playerStats.averagePlayersPerTeam = 
        Math.round((stats.playerStats.totalPlayers / stats.total) * 100) / 100;
    }
    
    return {
      success: true,
      stats,
      appliedFilters: Object.entries(validatedFilters)
        .filter(([_, value]) => value !== undefined && value !== 'all')
        .map(([key, _]) => key)
    };

  } catch (error) {
    console.error('Error getting admin team stats:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get team statistics'
    };
  }
}

export async function bulkUpdateTeamStatus(
  teamIds: string[],
  newStatus: string,
  requestingUserId: string,
  comments?: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!teamIds.length || teamIds.length > 50) {
      return { success: false, error: 'Invalid team IDs array (1-50 teams allowed)' };
    }

    const validStatuses = ['draft', 'submitted', 'verified', 'rejected', 'active'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: 'Invalid status' };
    }

    // Use batches for atomic updates (max 500 operations per batch)
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchTeamIds = teamIds.slice(i, i + batchSize);
      
      batchTeamIds.forEach(teamId => {
        const teamRef = adminDb.collection('teams').doc(teamId);
        batch.update(teamRef, {
          status: newStatus,
          verificationStatus: newStatus === 'verified' ? 'verified' : 
                              newStatus === 'rejected' ? 'rejected' : 'pending',
          verifiedBy: requestingUserId,
          verifiedAt: new Date(),
          verificationComments: comments || '',
          updatedAt: new Date()
        });
      });
      
      batches.push({ batch, teamIds: batchTeamIds });
    }

    // Execute all batches
    const results = await Promise.all(
      batches.map(async ({ batch, teamIds: batchTeamIds }) => {
        try {
          await batch.commit();
          return { success: true, teamIds: batchTeamIds };
        } catch (error) {
          return { success: false, error: error.message, teamIds: batchTeamIds };
        }
      })
    );

    const successful = results.filter(r => r.success).flatMap(r => r.teamIds);
    const failed = results.filter(r => !r.success);

    return {
      success: failed.length === 0,
      message: `Successfully updated ${successful.length} teams${failed.length > 0 ? `, failed to update ${failed.length} teams` : ''}`,
      successful,
      failed: failed.map(f => ({ teamIds: f.teamIds, error: f.error }))
    };

  } catch (error) {
    console.error('Error in bulk update team status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk update teams'
    };
  }
}