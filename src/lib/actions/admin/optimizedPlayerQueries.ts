'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { optimizePlayerDocument, createPaginatedResponse } from '@/lib/utils/documentOptimizer';

// Comprehensive filter schemas for admin player queries
const AdminPlayerFiltersSchema = z.object({
  // Pagination
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  
  // Status filters
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'all']).default('all'),
  isDeleted: z.boolean().optional(),
  
  // Geographic filters
  panchayat: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  
  // Demographics
  gender: z.enum(['M', 'F', 'all']).default('all'),
  ageRange: z.object({
    min: z.number().min(14).max(60),
    max: z.number().min(14).max(60)
  }).optional(),
  
  // Team association
  teamId: z.string().optional(),
  teamStatus: z.enum(['draft', 'submitted', 'verified', 'rejected', 'active', 'all']).default('all'),
  hasTeam: z.boolean().optional(),
  position: z.enum(['main', 'substitute', 'all']).default('all'),
  
  // Sport filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Document verification
  profilePhotoVerified: z.boolean().optional(),
  aadhaarVerified: z.boolean().optional(),
  documentsComplete: z.boolean().optional(),
  
  // Search
  searchQuery: z.string().max(100).optional(), // Name or phone search
  phoneNumber: z.string().optional(),
  
  // Date filters
  addedAfter: z.string().optional(),
  addedBefore: z.string().optional(),
  verifiedAfter: z.string().optional(),
  verifiedBefore: z.string().optional(),
  
  // Sorting
  sortBy: z.enum(['addedAt', 'verifiedAt', 'name', 'age', 'phone']).default('addedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const AdminPlayerStatsFiltersSchema = z.object({
  panchayat: z.string().optional(),
  district: z.string().optional(),
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  teamStatus: z.enum(['draft', 'submitted', 'verified', 'rejected', 'active', 'all']).default('all'),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
});

export async function getAdminPlayers(
  filters: z.infer<typeof AdminPlayerFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = AdminPlayerFiltersSchema.parse(filters);
    
    // Use collection group query for players across all teams
    let playersQuery = adminDb.collectionGroup('players');
    
    // Apply most selective filters first
    const appliedFilters: string[] = [];
    
    // Verification status filter
    if (validatedFilters.verificationStatus !== 'all') {
      playersQuery = playersQuery.where('verificationStatus', '==', validatedFilters.verificationStatus);
      appliedFilters.push('verificationStatus');
    }
    
    // Deleted status filter
    if (validatedFilters.isDeleted !== undefined) {
      playersQuery = playersQuery.where('isDeleted', '==', validatedFilters.isDeleted);
      appliedFilters.push('isDeleted');
    } else {
      // Default: exclude deleted players
      playersQuery = playersQuery.where('isDeleted', '!=', true);
      appliedFilters.push('excludeDeleted');
    }
    
    // Gender filter
    if (validatedFilters.gender !== 'all') {
      playersQuery = playersQuery.where('gender', '==', validatedFilters.gender);
      appliedFilters.push('gender');
    }
    
    // Geographic filters (most selective first)
    if (validatedFilters.panchayat) {
      playersQuery = playersQuery.where('profileData.panchayat', '==', validatedFilters.panchayat);
      appliedFilters.push('panchayat');
    } else if (validatedFilters.district) {
      playersQuery = playersQuery.where('profileData.district', '==', validatedFilters.district);
      appliedFilters.push('district');
    }
    
    // Position filter
    if (validatedFilters.position !== 'all') {
      playersQuery = playersQuery.where('position', '==', validatedFilters.position);
      appliedFilters.push('position');
    }
    
    // Phone number exact match
    if (validatedFilters.phoneNumber) {
      playersQuery = playersQuery.where('phone', '==', validatedFilters.phoneNumber);
      appliedFilters.push('phoneNumber');
    }
    
    // Date filters
    if (validatedFilters.addedAfter) {
      playersQuery = playersQuery.where('addedAt', '>=', new Date(validatedFilters.addedAfter));
      appliedFilters.push('addedAfter');
    }
    
    if (validatedFilters.addedBefore) {
      playersQuery = playersQuery.where('addedAt', '<=', new Date(validatedFilters.addedBefore));
      appliedFilters.push('addedBefore');
    }
    
    // Limit initial query for performance
    const queryLimit = Math.min(validatedFilters.limit * 3, 300); // Buffer for client-side filtering
    
    let playersSnapshot;
    try {
      playersSnapshot = await playersQuery.limit(queryLimit).get();
    } catch (indexError) {
      // If index error, fall back to a simpler query
      console.warn('Falling back to simpler query due to index error:', indexError.message);
      
      // Try a simpler query with just isDeleted filter
      const fallbackQuery = adminDb.collectionGroup('players')
        .where('isDeleted', '!=', true)
        .limit(queryLimit);
      
      try {
        playersSnapshot = await fallbackQuery.get();
      } catch (fallbackError) {
        // If even the fallback fails, return error
        throw new Error(`Database query failed. Please ensure Firestore indexes are deployed. Original error: ${indexError.message}`);
      }
    }
    
    // Get unique team IDs for batch fetching team data
    const teamIds = [...new Set(playersSnapshot.docs.map(doc => doc.data().teamId))];
    const teamsMap = new Map();
    
    if (teamIds.length > 0) {
      // Batch fetch team data
      const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
      const teamDocs = await adminDb.getAll(...teamRefs);
      
      teamDocs.forEach(doc => {
        if (doc.exists()) {
          teamsMap.set(doc.id, doc.data());
        }
      });
    }
    
    // Process players with team data
    let players = playersSnapshot.docs.map(doc => {
      const playerData = doc.data();
      const teamData = teamsMap.get(playerData.teamId);
      
      return {
        id: doc.id,
        ...playerData,
        addedAt: playerData.addedAt?.toDate?.()?.toISOString() || null,
        verifiedAt: playerData.verifiedAt?.toDate?.()?.toISOString() || null,
        team: teamData ? {
          id: playerData.teamId,
          name: teamData.name,
          sportName: teamData.sportName,
          status: teamData.status,
          genderCategory: teamData.genderCategory
        } : null
      };
    });
    
    // Apply client-side filters (for complex conditions)
    const clientSideFilters = {
      teamId: validatedFilters.teamId,
      teamStatus: validatedFilters.teamStatus,
      hasTeam: validatedFilters.hasTeam,
      ageRange: validatedFilters.ageRange,
      sportName: validatedFilters.sportName,
      genderCategory: validatedFilters.genderCategory,
      profilePhotoVerified: validatedFilters.profilePhotoVerified,
      aadhaarVerified: validatedFilters.aadhaarVerified,
      documentsComplete: validatedFilters.documentsComplete,
      searchQuery: validatedFilters.searchQuery?.toLowerCase()
    };
    
    // Apply team-specific filters
    if (clientSideFilters.teamId) {
      players = players.filter(player => player.teamId === clientSideFilters.teamId);
    }
    
    if (clientSideFilters.teamStatus !== 'all') {
      players = players.filter(player => player.team?.status === clientSideFilters.teamStatus);
    }
    
    if (clientSideFilters.hasTeam !== undefined) {
      players = players.filter(player => clientSideFilters.hasTeam ? !!player.team : !player.team);
    }
    
    // Age range filter
    if (clientSideFilters.ageRange) {
      players = players.filter(player => {
        const age = player.age;
        return age >= clientSideFilters.ageRange!.min && age <= clientSideFilters.ageRange!.max;
      });
    }
    
    // Sport filter
    if (clientSideFilters.sportName) {
      players = players.filter(player => player.team?.sportName === clientSideFilters.sportName);
    }
    
    if (clientSideFilters.genderCategory !== 'all') {
      players = players.filter(player => player.team?.genderCategory === clientSideFilters.genderCategory);
    }
    
    // Document verification filters
    if (clientSideFilters.profilePhotoVerified !== undefined) {
      players = players.filter(player => 
        !!player.documents?.profilePhoto?.verified === clientSideFilters.profilePhotoVerified
      );
    }
    
    if (clientSideFilters.aadhaarVerified !== undefined) {
      players = players.filter(player => {
        const aadhaarFrontVerified = !!player.documents?.aadhaarFront?.verified;
        const aadhaarBackVerified = !!player.documents?.aadhaarBack?.verified;
        return (aadhaarFrontVerified && aadhaarBackVerified) === clientSideFilters.aadhaarVerified;
      });
    }
    
    if (clientSideFilters.documentsComplete !== undefined) {
      players = players.filter(player => {
        const hasProfilePhoto = !!player.documents?.profilePhoto?.url;
        const hasAadhaarFront = !!player.documents?.aadhaarFront?.url;
        const hasAadhaarBack = !!player.documents?.aadhaarBack?.url;
        const isComplete = hasProfilePhoto && hasAadhaarFront && hasAadhaarBack;
        return isComplete === clientSideFilters.documentsComplete;
      });
    }
    
    // Search filter
    if (clientSideFilters.searchQuery) {
      players = players.filter(player =>
        player.name?.toLowerCase().includes(clientSideFilters.searchQuery!) ||
        player.phone?.includes(clientSideFilters.searchQuery!) ||
        player.team?.name?.toLowerCase().includes(clientSideFilters.searchQuery!)
      );
    }
    
    // Sort players
    players.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (validatedFilters.sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'age':
          aValue = a.age || 0;
          bValue = b.age || 0;
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'verifiedAt':
          aValue = new Date(a.verifiedAt || 0).getTime();
          bValue = new Date(b.verifiedAt || 0).getTime();
          break;
        default: // addedAt
          aValue = new Date(a.addedAt || 0).getTime();
          bValue = new Date(b.addedAt || 0).getTime();
      }
      
      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return validatedFilters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Pagination
    const startIndex = validatedFilters.offset;
    const endIndex = startIndex + validatedFilters.limit;
    const paginatedPlayers = players.slice(startIndex, endIndex);
    
    // Optimize player documents
    const optimizedPlayers = paginatedPlayers.map(player => ({
      ...optimizePlayerDocument(player),
      team: player.team
    }));
    
    return {
      success: true,
      players: optimizedPlayers,
      pagination: {
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        count: optimizedPlayers.length,
        total: players.length,
        hasMore: endIndex < players.length
      },
      appliedFilters,
      meta: {
        queryOptimized: appliedFilters.length > 0,
        teamsLoaded: teamIds.length,
        clientSideFiltersApplied: Object.values(clientSideFilters).some(v => v !== undefined && v !== 'all')
      }
    };

  } catch (error) {
    console.error('Error in getAdminPlayers:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        players: []
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch players',
      players: []
    };
  }
}

export async function getAdminPlayerStats(
  filters: z.infer<typeof AdminPlayerStatsFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = AdminPlayerStatsFiltersSchema.parse(filters);
    
    // Use collection group query for comprehensive stats
    let playersQuery = adminDb.collectionGroup('players');
    playersQuery = playersQuery.where('isDeleted', '!=', true);
    
    // Apply filters
    if (validatedFilters.genderCategory !== 'all') {
      // Note: We'll need to join with team data for this filter
    }
    
    if (validatedFilters.dateRange) {
      playersQuery = playersQuery
        .where('addedAt', '>=', new Date(validatedFilters.dateRange.start))
        .where('addedAt', '<=', new Date(validatedFilters.dateRange.end));
    }
    
    let playersSnapshot;
    try {
      playersSnapshot = await playersQuery.get();
    } catch (indexError) {
      console.warn('Falling back to simpler stats query due to index error:', indexError.message);
      
      // Fall back to basic query
      const fallbackQuery = adminDb.collectionGroup('players')
        .where('isDeleted', '!=', true);
      
      try {
        playersSnapshot = await fallbackQuery.get();
      } catch (fallbackError) {
        throw new Error(`Database query failed. Please ensure Firestore indexes are deployed. Original error: ${indexError.message}`);
      }
    }
    
    // Get team data for filtering and aggregation
    const teamIds = [...new Set(playersSnapshot.docs.map(doc => doc.data().teamId))];
    const teamsMap = new Map();
    
    if (teamIds.length > 0) {
      const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
      const teamDocs = await adminDb.getAll(...teamRefs);
      
      teamDocs.forEach(doc => {
        if (doc.exists()) {
          teamsMap.set(doc.id, doc.data());
        }
      });
    }
    
    // Filter and calculate statistics
    let players = playersSnapshot.docs.map(doc => {
      const playerData = doc.data();
      const teamData = teamsMap.get(playerData.teamId);
      return { ...playerData, team: teamData };
    });
    
    // Apply team-based filters
    if (validatedFilters.sportName) {
      players = players.filter(player => player.team?.sportName === validatedFilters.sportName);
    }
    
    if (validatedFilters.genderCategory !== 'all') {
      players = players.filter(player => player.team?.genderCategory === validatedFilters.genderCategory);
    }
    
    if (validatedFilters.teamStatus !== 'all') {
      players = players.filter(player => player.team?.status === validatedFilters.teamStatus);
    }
    
    if (validatedFilters.panchayat) {
      players = players.filter(player => 
        player.profileData?.panchayat === validatedFilters.panchayat ||
        player.team?.panchayat === validatedFilters.panchayat
      );
    }
    
    if (validatedFilters.district) {
      players = players.filter(player => 
        player.profileData?.district === validatedFilters.district ||
        player.team?.district === validatedFilters.district
      );
    }
    
    // Calculate comprehensive statistics
    const stats = {
      total: players.length,
      byVerificationStatus: {} as Record<string, number>,
      byGender: {} as Record<string, number>,
      byPosition: {} as Record<string, number>,
      bySport: {} as Record<string, number>,
      byPanchayat: {} as Record<string, number>,
      byDistrict: {} as Record<string, number>,
      byTeamStatus: {} as Record<string, number>,
      ageDistribution: {
        '14-20': 0,
        '21-30': 0,
        '31-40': 0,
        '41-50': 0,
        '51-60': 0,
        unknown: 0
      },
      documentStats: {
        profilePhotoUploaded: 0,
        profilePhotoVerified: 0,
        aadhaarFrontUploaded: 0,
        aadhaarFrontVerified: 0,
        aadhaarBackUploaded: 0,
        aadhaarBackVerified: 0,
        allDocumentsComplete: 0,
        allDocumentsVerified: 0
      },
      teamAssociation: {
        withTeam: 0,
        withoutTeam: 0,
        inVerifiedTeams: 0,
        inActiveTeams: 0
      }
    };
    
    players.forEach(player => {
      // Verification status
      const verificationStatus = player.verificationStatus || 'pending';
      stats.byVerificationStatus[verificationStatus] = (stats.byVerificationStatus[verificationStatus] || 0) + 1;
      
      // Gender
      const gender = player.gender || 'unknown';
      stats.byGender[gender] = (stats.byGender[gender] || 0) + 1;
      
      // Position
      const position = player.position || 'main';
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1;
      
      // Sport (from team)
      if (player.team?.sportName) {
        const sport = player.team.sportName;
        stats.bySport[sport] = (stats.bySport[sport] || 0) + 1;
      }
      
      // Panchayat
      const panchayat = player.profileData?.panchayat || player.team?.panchayat || 'unknown';
      stats.byPanchayat[panchayat] = (stats.byPanchayat[panchayat] || 0) + 1;
      
      // District
      const district = player.profileData?.district || player.team?.district || 'unknown';
      stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
      
      // Team status
      if (player.team?.status) {
        const teamStatus = player.team.status;
        stats.byTeamStatus[teamStatus] = (stats.byTeamStatus[teamStatus] || 0) + 1;
      }
      
      // Age distribution
      const age = player.age;
      if (age) {
        if (age >= 14 && age <= 20) stats.ageDistribution['14-20']++;
        else if (age >= 21 && age <= 30) stats.ageDistribution['21-30']++;
        else if (age >= 31 && age <= 40) stats.ageDistribution['31-40']++;
        else if (age >= 41 && age <= 50) stats.ageDistribution['41-50']++;
        else if (age >= 51 && age <= 60) stats.ageDistribution['51-60']++;
      } else {
        stats.ageDistribution.unknown++;
      }
      
      // Document statistics
      const docs = player.documents || {};
      
      if (docs.profilePhoto?.url) stats.documentStats.profilePhotoUploaded++;
      if (docs.profilePhoto?.verified) stats.documentStats.profilePhotoVerified++;
      if (docs.aadhaarFront?.url) stats.documentStats.aadhaarFrontUploaded++;
      if (docs.aadhaarFront?.verified) stats.documentStats.aadhaarFrontVerified++;
      if (docs.aadhaarBack?.url) stats.documentStats.aadhaarBackUploaded++;
      if (docs.aadhaarBack?.verified) stats.documentStats.aadhaarBackVerified++;
      
      const allDocsComplete = docs.profilePhoto?.url && docs.aadhaarFront?.url && docs.aadhaarBack?.url;
      const allDocsVerified = docs.profilePhoto?.verified && docs.aadhaarFront?.verified && docs.aadhaarBack?.verified;
      
      if (allDocsComplete) stats.documentStats.allDocumentsComplete++;
      if (allDocsVerified) stats.documentStats.allDocumentsVerified++;
      
      // Team association
      if (player.team) {
        stats.teamAssociation.withTeam++;
        if (player.team.status === 'verified') stats.teamAssociation.inVerifiedTeams++;
        if (player.team.status === 'active') stats.teamAssociation.inActiveTeams++;
      } else {
        stats.teamAssociation.withoutTeam++;
      }
    });
    
    return {
      success: true,
      stats,
      appliedFilters: Object.entries(validatedFilters)
        .filter(([_, value]) => value !== undefined && value !== 'all')
        .map(([key, _]) => key)
    };

  } catch (error) {
    console.error('Error getting admin player stats:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get player statistics'
    };
  }
}

export async function bulkVerifyPlayers(
  playerUpdates: Array<{
    teamId: string;
    playerId: string;
    status: 'verified' | 'rejected';
    comments?: string;
  }>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!playerUpdates.length || playerUpdates.length > 100) {
      return { success: false, error: 'Invalid player updates array (1-100 players allowed)' };
    }

    // Use batches for atomic updates
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < playerUpdates.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchUpdates = playerUpdates.slice(i, i + batchSize);
      
      batchUpdates.forEach(update => {
        const playerRef = adminDb
          .collection('teams').doc(update.teamId)
          .collection('players').doc(update.playerId);
        
        batch.update(playerRef, {
          verificationStatus: update.status,
          verifiedBy: requestingUserId,
          verifiedAt: new Date(),
          verificationComments: update.comments || '',
          updatedAt: new Date()
        });
      });
      
      batches.push({ batch, updates: batchUpdates });
    }

    // Execute all batches
    const results = await Promise.all(
      batches.map(async ({ batch, updates }) => {
        try {
          await batch.commit();
          return { success: true, updates };
        } catch (error) {
          return { success: false, error: error.message, updates };
        }
      })
    );

    const successful = results.filter(r => r.success).flatMap(r => r.updates);
    const failed = results.filter(r => !r.success);

    return {
      success: failed.length === 0,
      message: `Successfully updated ${successful.length} players${failed.length > 0 ? `, failed to update ${failed.flatMap(f => f.updates).length} players` : ''}`,
      successful: successful.length,
      failed: failed.length
    };

  } catch (error) {
    console.error('Error in bulk verify players:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk verify players'
    };
  }
}