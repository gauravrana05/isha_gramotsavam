'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { optimizeTeamDocument, optimizePlayerDocument } from '@/lib/utils/documentOptimizer';

// Comprehensive filter schemas for admin verification queries
const AdminVerificationQueueFiltersSchema = z.object({
  // Pagination
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  
  // Verification status filters
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'all']).default('pending'),
  teamStatus: z.enum(['draft', 'submitted', 'verified', 'rejected', 'active', 'all']).default('submitted'),
  
  // Priority filters
  priority: z.enum(['high', 'medium', 'low', 'all']).default('all'),
  urgency: z.enum(['critical', 'standard', 'low', 'all']).default('all'),
  
  // Geographic filters
  panchayat: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  
  // Sport and category filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Team composition filters
  playerCountRange: z.object({
    min: z.number().min(1),
    max: z.number().max(15)
  }).optional(),
  hasIncompleteDocuments: z.boolean().optional(),
  hasRejectedPlayers: z.boolean().optional(),
  
  // Date filters
  submittedAfter: z.string().optional(),
  submittedBefore: z.string().optional(),
  lastActivityAfter: z.string().optional(),
  lastActivityBefore: z.string().optional(),
  
  // Assignment filters
  assignedToVolunteer: z.string().optional(),
  unassigned: z.boolean().optional(),
  
  // Document completeness
  documentCompleteness: z.enum(['complete', 'incomplete', 'partial', 'all']).default('all'),
  
  // Search
  searchQuery: z.string().max(100).optional(),
  
  // Sorting
  sortBy: z.enum(['submittedAt', 'updatedAt', 'priority', 'playerCount', 'teamName']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const VerificationWorkloadFiltersSchema = z.object({
  volunteerId: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  includeStats: z.boolean().default(true)
});

const BulkVerificationSchema = z.object({
  verifications: z.array(z.object({
    teamId: z.string().min(1),
    status: z.enum(['verified', 'rejected']),
    comments: z.string().max(500).optional(),
    playerVerifications: z.array(z.object({
      playerId: z.string().min(1),
      status: z.enum(['verified', 'rejected']),
      comments: z.string().max(500).optional()
    })).optional()
  })).min(1).max(50),
  verifiedBy: z.string().min(1)
});

export async function getAdminVerificationQueue(
  filters: z.infer<typeof AdminVerificationQueueFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || !['admin', 'verification_volunteer'].includes(userDoc.data()?.role)) {
      return { success: false, error: 'Unauthorized: Admin or verification volunteer access required' };
    }

    const validatedFilters = AdminVerificationQueueFiltersSchema.parse(filters);
    
    // Build optimized teams query for verification
    let teamsQuery: any = adminDb.collection('teams');
    const appliedFilters: string[] = [];
    
    // Most selective filters first
    if (validatedFilters.teamStatus !== 'all') {
      teamsQuery = teamsQuery.where('status', '==', validatedFilters.teamStatus);
      appliedFilters.push('teamStatus');
    }
    
    if (validatedFilters.verificationStatus !== 'all') {
      teamsQuery = teamsQuery.where('verificationStatus', '==', validatedFilters.verificationStatus);
      appliedFilters.push('verificationStatus');
    }
    
    // Geographic filters (high selectivity)
    if (validatedFilters.panchayat) {
      teamsQuery = teamsQuery.where('panchayat', '==', validatedFilters.panchayat);
      appliedFilters.push('panchayat');
    } else if (validatedFilters.district) {
      teamsQuery = teamsQuery.where('district', '==', validatedFilters.district);
      appliedFilters.push('district');
    } else if (validatedFilters.state) {    
      teamsQuery = teamsQuery.where('state', '==', validatedFilters.state);
      appliedFilters.push('state');
    }
    
    // Sport filters
    if (validatedFilters.sportName) {
      teamsQuery = teamsQuery.where('sportName', '==', validatedFilters.sportName);
      appliedFilters.push('sportName');
    }
    
    if (validatedFilters.genderCategory !== 'all') {
      teamsQuery = teamsQuery.where('genderCategory', '==', validatedFilters.genderCategory);
      appliedFilters.push('genderCategory');
    }
    
    // Date filters
    if (validatedFilters.submittedAfter) {
      teamsQuery = teamsQuery.where('submittedAt', '>=', new Date(validatedFilters.submittedAfter));
      appliedFilters.push('submittedAfter');
    }
    
    if (validatedFilters.submittedBefore) {
      teamsQuery = teamsQuery.where('submittedAt', '<=', new Date(validatedFilters.submittedBefore));
      appliedFilters.push('submittedBefore');
    }
    
    // Execute query with buffer for client-side filtering
    const queryLimit = Math.min(validatedFilters.limit * 2, 200);
    const teamsSnapshot = await teamsQuery
      .orderBy(validatedFilters.sortBy === 'teamName' ? 'name' : validatedFilters.sortBy, validatedFilters.sortOrder)
      .limit(queryLimit)
      .offset(validatedFilters.offset)
      .get();
    
    // Get team IDs for fetching players and verification records
    const teamIds = teamsSnapshot.docs.map((doc: any) => doc.id);
    
    // Batch fetch players and verification records
    const [playersMap, verificationsMap] = await Promise.all([
      getTeamPlayersMap(teamIds),
      getTeamVerificationsMap(teamIds)
    ]);
    
    // Process teams with verification data
    let teams = teamsSnapshot.docs.map((doc : any) => {
      const teamData = doc.data();
      const players = playersMap.get(doc.id) || [];
      const verification = verificationsMap.get(doc.id);
      
      // Calculate verification metrics
      const verificationMetrics = calculateVerificationMetrics(players, verification);
      
      return {
        id: doc.id,
        ...teamData,
        submittedAt: teamData.submittedAt?.toDate?.()?.toISOString() || null,
        updatedAt: teamData.updatedAt?.toDate?.()?.toISOString() || null,
        verifiedAt: teamData.verifiedAt?.toDate?.()?.toISOString() || null,
        players: players.map(optimizePlayerDocument),
        verification,
        metrics: verificationMetrics,
        priority: calculateVerificationPriority(teamData, verificationMetrics),
        urgency: calculateVerificationUrgency(teamData, verificationMetrics)
      };
    });
    
    // Apply client-side filters
    const clientSideFilters = {
      priority: validatedFilters.priority,
      urgency: validatedFilters.urgency,
      playerCountRange: validatedFilters.playerCountRange,
      hasIncompleteDocuments: validatedFilters.hasIncompleteDocuments,
      hasRejectedPlayers: validatedFilters.hasRejectedPlayers,
      assignedToVolunteer: validatedFilters.assignedToVolunteer,
      unassigned: validatedFilters.unassigned,
      documentCompleteness: validatedFilters.documentCompleteness,
      searchQuery: validatedFilters.searchQuery?.toLowerCase(),
      lastActivityAfter: validatedFilters.lastActivityAfter,
      lastActivityBefore: validatedFilters.lastActivityBefore
    };
    
    // Apply priority filter
    if (clientSideFilters.priority !== 'all') {
      teams = teams.filter((team:any) => team.priority === clientSideFilters.priority);
    }
    
    // Apply urgency filter
    if (clientSideFilters.urgency !== 'all') {
      teams = teams.filter((team:any) => team.urgency === clientSideFilters.urgency);
    }
    
    // Player count range filter
    if (clientSideFilters.playerCountRange) {
      teams = teams.filter((team:any) => {
        const playerCount = (team as any).currentPlayers || team.players?.length || 0;
        return playerCount >= clientSideFilters.playerCountRange!.min && 
               playerCount <= clientSideFilters.playerCountRange!.max;
      });
    }
    
    // Document completeness filters
    if (clientSideFilters.hasIncompleteDocuments !== undefined) {
      teams = teams.filter((team:any) => 
        team.metrics.hasIncompleteDocuments === clientSideFilters.hasIncompleteDocuments
      );
    }
    
    if (clientSideFilters.hasRejectedPlayers !== undefined) {
      teams = teams.filter((team:any) => 
        team.metrics.hasRejectedPlayers === clientSideFilters.hasRejectedPlayers
      );
    }
    
    if (clientSideFilters.documentCompleteness !== 'all') {
      teams = teams.filter((team:any) => {
        const completeness = team.metrics.documentCompleteness;
        return completeness === clientSideFilters.documentCompleteness;
      });
    }
    
    // Assignment filters
    if (clientSideFilters.assignedToVolunteer) {
      teams = teams.filter((team:any) => 
        team.verification?.assignedTo === clientSideFilters.assignedToVolunteer
      );
    }
    
    if (clientSideFilters.unassigned !== undefined) {
      teams = teams.filter((team:any) => {
        const isUnassigned = !team.verification?.assignedTo;
        return clientSideFilters.unassigned ? isUnassigned : !isUnassigned;
      });
    }
    
    // Search filter
    if (clientSideFilters.searchQuery) {
      teams = teams.filter((team:any) =>
        (team as any).name?.toLowerCase().includes(clientSideFilters.searchQuery!) ||
        (team as any).captainProfile?.name?.toLowerCase().includes(clientSideFilters.searchQuery!) ||
        (team as any).captainProfile?.phone?.includes(clientSideFilters.searchQuery!)
      );
    }
    
    // Last activity filters
    if (clientSideFilters.lastActivityAfter) {
      const afterDate = new Date(clientSideFilters.lastActivityAfter);
      teams = teams.filter((team:any) => {
        const lastActivity = new Date(team.updatedAt || team.submittedAt || 0);
        return lastActivity >= afterDate;
      });
    }
    
    if (clientSideFilters.lastActivityBefore) {
      const beforeDate = new Date(clientSideFilters.lastActivityBefore);
      teams = teams.filter((team:any) => {
        const lastActivity = new Date(team.updatedAt || team.submittedAt || 0);
        return lastActivity <= beforeDate;
      });
    }
    
    // Final pagination after client-side filtering
    const paginatedTeams = teams.slice(0, validatedFilters.limit);
    
    // Optimize teams for transfer
    const optimizedTeams = paginatedTeams.map((team:any) => ({
      ...optimizeTeamDocument(team),
      players: team.players,
      verification: team.verification,
      metrics: team.metrics,
      priority: team.priority,
      urgency: team.urgency,
      submittedAt: team.submittedAt,
      verifiedAt: team.verifiedAt
    }));
    
    return {
      success: true,
      teams: optimizedTeams,
      pagination: {
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        count: optimizedTeams.length,
        total: teams.length,
        hasMore: optimizedTeams.length === validatedFilters.limit
      },
      appliedFilters,
      summary: {
        totalInQueue: teams.length,
        highPriority: teams.filter((t : any) => t.priority === 'high').length,
        critical: teams.filter((t: any) => t.urgency === 'critical').length,
        avgPlayersPerTeam: teams.length > 0
          ? Math.round(
              teams.reduce(
                (sum: number, t: any) =>
                  sum + (t.currentPlayers ?? t.players?.length ?? 0),
                0
              ) /
                teams.length *
                100
            ) / 100
          : 0,
        documentsIncomplete: teams.filter((t: any) => t.metrics.hasIncompleteDocuments).length
      },
      meta: {
        queryOptimized: appliedFilters.length > 0,
        teamsProcessed: teamIds.length,
        clientSideFiltersApplied: Object.values(clientSideFilters).some(v => v !== undefined && v !== 'all')
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`,
        teams: []
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch verification queue',
      teams: []
    };
  }
}

export async function getVerificationWorkload(
  filters: z.infer<typeof VerificationWorkloadFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || !['admin', 'verification_volunteer'].includes(userDoc.data()?.role)) {
      return { success: false, error: 'Unauthorized access' };
    }

    const validatedFilters = VerificationWorkloadFiltersSchema.parse(filters);
    const targetVolunteerId = validatedFilters.volunteerId || requestingUserId;
    
    // Build queries for workload analysis
    let teamsQuery: any = adminDb.collection('teams');
    
    // Date range filter
    if (validatedFilters.dateRange) {
      teamsQuery = teamsQuery
        .where('submittedAt', '>=', new Date(validatedFilters.dateRange.start))
        .where('submittedAt', '<=', new Date(validatedFilters.dateRange.end));
    }
    
    const teamsSnapshot = await teamsQuery.get();
    
    // Get verification records for the volunteer
    const verificationRecordsQuery = adminDb.collectionGroup('verification')
      .where('verifiedBy', '==', targetVolunteerId);
    
    const verificationRecordsSnapshot = await verificationRecordsQuery.get();
    
    // Calculate workload statistics
    const workload = {
      volunteer: {
        id: targetVolunteerId,
        name: userDoc.data()?.firstName + ' ' + userDoc.data()?.lastName,
        role: userDoc.data()?.role
      },
      summary: {
        totalAssigned: 0,
        totalCompleted: 0,
        totalPending: 0,
        totalRejected: 0,
        averageTimePerVerification: 0,
        productivityScore: 0
      },
      daily: [] as any[],
      byStatus: {
        verified: 0,
        rejected: 0,
        pending: 0
      },
      bySport: {} as Record<string, number>,
      recent: [] as any[]
    };
    
    // Process verification records
    const verificationTimes: number[] = [];
    
    verificationRecordsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status;
      
      if (status === 'verified' || status === 'rejected') {
        workload.summary.totalCompleted++;
        if (status === 'verified') {
          workload.byStatus.verified++;
        } else if (status === 'rejected') {
          workload.byStatus.rejected++;
        }
        
        // Calculate verification time if available
        if (data.verifiedAt && data.createdAt) {
          const timeSpent = data.verifiedAt.toMillis() - data.createdAt.toMillis();
          verificationTimes.push(timeSpent);
        }
      } else {
        workload.summary.totalPending++;
        workload.byStatus.pending++;
      }
    });
    
    // Calculate average verification time
    if (verificationTimes.length > 0) {
      const avgTimeMs = verificationTimes.reduce((sum, time) => sum + time, 0) / verificationTimes.length;
      workload.summary.averageTimePerVerification = Math.round(avgTimeMs / (1000 * 60)); // Convert to minutes
    }
    
    // Calculate productivity score (verified teams per day)
    const daysInRange = validatedFilters.dateRange ? 
      Math.ceil((new Date(validatedFilters.dateRange.end).getTime() - new Date(validatedFilters.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) : 
      30; // Default 30 days
    
    workload.summary.productivityScore = Math.round((workload.byStatus.verified / daysInRange) * 100) / 100;
    
    // Get recent activity (last 10 verifications)
    const recentVerifications = verificationRecordsSnapshot.docs
      .filter(doc => doc.data().verifiedAt)
      .sort((a, b) => b.data().verifiedAt.toMillis() - a.data().verifiedAt.toMillis())
      .slice(0, 10);
    
    // Get team data for recent verifications
    const recentTeamIds = recentVerifications.map(doc => doc.data().teamId);
    const recentTeamsMap = await getTeamsMap(recentTeamIds);
    
    workload.recent = recentVerifications.map(doc => {
      const data = doc.data();
      const teamData = recentTeamsMap.get(data.teamId);
      
      return {
        teamId: data.teamId,
        teamName: teamData?.name || 'Unknown Team',
        status: data.status,
        verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || null,
        timeSpent: data.verifiedAt && data.createdAt ? 
          Math.round((data.verifiedAt.toMillis() - data.createdAt.toMillis()) / (1000 * 60)) : null
      };
    });
    
    return {
      success: true,
      workload,
      meta: {
        dateRange: validatedFilters.dateRange,
        totalRecordsProcessed: verificationRecordsSnapshot.size,
        includeStats: validatedFilters.includeStats
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get verification workload'
    };
  }
}

export async function bulkProcessVerifications(
  request: z.infer<typeof BulkVerificationSchema>,
  requestingUserId: string
) {
  try {
    // Validate permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || !['admin', 'verification_volunteer'].includes(userDoc.data()?.role)) {
      return { success: false, error: 'Unauthorized access' };
    }

    const validatedRequest = BulkVerificationSchema.parse(request);
    const { verifications, verifiedBy } = validatedRequest;
    
    // Use batches for atomic operations
    const batchSize = 25; // Conservative for complex operations
    const batches = [];
    
    for (let i = 0; i < verifications.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchVerifications = verifications.slice(i, i + batchSize);
      
      for (const verification of batchVerifications) {
        // Update team verification status
        const teamRef = adminDb.collection('teams').doc(verification.teamId);
        batch.update(teamRef, {
          verificationStatus: verification.status,
          verifiedBy: verifiedBy,
          verifiedAt: new Date(),
          verificationComments: verification.comments || '',
          status: verification.status === 'verified' ? 'active' : 'rejected',
          updatedAt: new Date()
        });
        
        // Update team verification record
        const verificationRef = adminDb
          .collection('teams').doc(verification.teamId)
          .collection('verification').doc('initial');
        
        batch.update(verificationRef, {
          status: verification.status,
          verifiedBy: verifiedBy,
          verifiedAt: new Date(),
          comments: verification.comments || '',
          updatedAt: new Date()
        });
        
        // Update individual players if specified
        if (verification.playerVerifications) {
          verification.playerVerifications.forEach(playerVerification => {
            const playerRef = adminDb
              .collection('teams').doc(verification.teamId)
              .collection('players').doc(playerVerification.playerId);
            
            batch.update(playerRef, {
              verificationStatus: playerVerification.status,
              verifiedBy: verifiedBy,
              verifiedAt: new Date(),
              verificationComments: playerVerification.comments || '',
              updatedAt: new Date()
            });
          });
        }
      }
      
      batches.push({ batch, verifications: batchVerifications });
    }
    
    // Execute all batches
    const results = await Promise.all(
      batches.map(async ({ batch, verifications: batchVerifications }) => {
        try {
          await batch.commit();
          return { success: true, verifications: batchVerifications };
        } catch (error) {
          let errorMessage = 'Unknown error';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
            errorMessage = (error as any).message;
          }
          return { success: false, error: errorMessage, verifications: batchVerifications };
        }
      })
    );
    const successful = results.filter(r => r.success).flatMap(r => r.verifications);
    const failed = results.filter(r => !r.success);
    
    return {
      success: failed.length === 0,
      message: `Successfully processed ${successful.length} verifications${failed.length > 0 ? `, failed to process ${failed.flatMap(f => f.verifications).length} verifications` : ''}`,
      successful: successful.length,
      failed: failed.length,
      details: {
        verified: successful.filter(v => v.status === 'verified').length,
        rejected: successful.filter(v => v.status === 'rejected').length
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk process verifications'
    };
  }
}

// Helper functions
async function getTeamPlayersMap(teamIds: string[]): Promise<Map<string, any[]>> {
  const playersMap = new Map();
  
  if (teamIds.length === 0) return playersMap;
  
  // Use collection group query for efficiency
  const playersSnapshot = await adminDb.collectionGroup('players')
    .where('teamId', 'in', teamIds.slice(0, 10)) // Firestore 'in' limit
    .where('isDeleted', '!=', true)
    .get();
  
  playersSnapshot.docs.forEach(doc => {
    const playerData = doc.data();
    const teamId = playerData.teamId;
    
    if (!playersMap.has(teamId)) {
      playersMap.set(teamId, []);
    }
    
    playersMap.get(teamId).push({
      id: doc.id,
      ...playerData,
      addedAt: playerData.addedAt?.toDate?.()?.toISOString() || null,
      verifiedAt: playerData.verifiedAt?.toDate?.()?.toISOString() || null
    });
  });
  
  return playersMap;
}

async function getTeamVerificationsMap(teamIds: string[]): Promise<Map<string, any>> {
  const verificationsMap = new Map();
  
  if (teamIds.length === 0) return verificationsMap;
  
  for (const teamId of teamIds) {
    try {
      const verificationDoc = await adminDb
        .collection('teams').doc(teamId)
        .collection('verification').doc('initial')
        .get();
      
      if (verificationDoc.exists) {
        const data = verificationDoc.data();
        verificationsMap.set(teamId, {
          ...data,
          createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
          verifiedAt: data?.verifiedAt?.toDate?.()?.toISOString() || null
        });
      }
    } catch (error) {
    }
  }
  
  return verificationsMap;
}

function calculateVerificationMetrics(players: any[], verification: any) {
  const totalPlayers = players.length;
  const verifiedPlayers = players.filter(p => p.verificationStatus === 'verified').length;
  const rejectedPlayers = players.filter(p => p.verificationStatus === 'rejected').length;
  const pendingPlayers = totalPlayers - verifiedPlayers - rejectedPlayers;
  
  const hasIncompleteDocuments = players.some(p => {
    const docs = p.documents || {};
    return !docs.profilePhoto?.url || !docs.aadhaarFront?.url || !docs.aadhaarBack?.url;
  });
  
  const hasRejectedPlayers = rejectedPlayers > 0;
  
  let documentCompleteness: 'complete' | 'incomplete' | 'partial' = 'complete';
  if (hasIncompleteDocuments) {
    const completeDocsCount = players.filter(p => {
      const docs = p.documents || {};
      return docs.profilePhoto?.url && docs.aadhaarFront?.url && docs.aadhaarBack?.url;
    }).length;
    
    documentCompleteness = completeDocsCount === 0 ? 'incomplete' : 'partial';
  }
  
  return {
    totalPlayers,
    verifiedPlayers,
    rejectedPlayers,
    pendingPlayers,
    completionPercentage: totalPlayers > 0 ? Math.round((verifiedPlayers / totalPlayers) * 100) : 0,
    hasIncompleteDocuments,
    hasRejectedPlayers,
    documentCompleteness,
    allChecksComplete: verification?.checks?.allChecksComplete || false
  };
}

function calculateVerificationPriority(teamData: any, metrics: any): 'high' | 'medium' | 'low' {
  let score = 0;
  
  // High priority factors
  if (metrics.hasRejectedPlayers) score += 3;
  if (metrics.hasIncompleteDocuments) score += 2;
  if (teamData.sportName === 'Volleyball') score += 1; // Popular sport
  if (teamData.currentPlayers >= teamData.maxPlayers) score += 2; // Complete team
  
  // Time-based priority
  const submittedDaysAgo = teamData.submittedAt ? 
    Math.ceil((Date.now() - teamData.submittedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  if (submittedDaysAgo > 7) score += 3;
  else if (submittedDaysAgo > 3) score += 2;
  else if (submittedDaysAgo > 1) score += 1;
  
  return score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
}

function calculateVerificationUrgency(teamData: any, metrics: any): 'critical' | 'standard' | 'low' {
  const submittedDaysAgo = teamData.submittedAt ? 
    Math.ceil((Date.now() - teamData.submittedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  // Critical: Old submissions or complete teams with issues
  if (submittedDaysAgo > 10 || (metrics.completionPercentage === 100 && metrics.hasRejectedPlayers)) {
    return 'critical';
  }
  
  // Standard: Recent complete teams or aging submissions
  if (metrics.completionPercentage === 100 || submittedDaysAgo > 5) {
    return 'standard';
  }
  
  return 'low';
}

async function getTeamsMap(teamIds: string[]): Promise<Map<string, any>> {
  const teamsMap = new Map();
  
  if (teamIds.length === 0) return teamsMap;
  
  const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
  const teamDocs = await adminDb.getAll(...teamRefs);
  
  teamDocs.forEach(doc => {
    if (doc.exists) {
      teamsMap.set(doc.id, doc.data());
    }
  });
  
  return teamsMap;
}