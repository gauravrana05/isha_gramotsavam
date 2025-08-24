'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// Comprehensive filter schemas for admin venue and assignment queries
const AdminVenueFiltersSchema = z.object({
  // Pagination
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  
  // Venue type and level filters
  level: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  venueType: z.enum(['sports_complex', 'school', 'community_center', 'ground', 'all']).default('all'),
  
  // Geographic filters
  district: z.string().optional(),
  taluk: z.string().optional(),
  state: z.string().optional(),
  
  // Capacity and assignment filters
  minCapacity: z.number().min(0).optional(),
  maxCapacity: z.number().min(0).optional(),
  hasAssignedTeams: z.boolean().optional(),
  isActive: z.boolean().optional(),
  
  // Sport and category filters
  supportedSports: z.array(z.string()).optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Assignment status
  assignmentStatus: z.enum(['assigned', 'unassigned', 'partial', 'all']).default('all'),
  
  // Search
  searchQuery: z.string().max(100).optional(),
  
  // Sorting
  sortBy: z.enum(['name', 'capacity', 'assignedTeams', 'district']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

const TeamAssignmentFiltersSchema = z.object({
  // Pagination
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  
  // Assignment filters
  venueId: z.string().optional(),
  currentLevel: z.enum(['cluster', 'division', 'final', 'all']).default('all'),
  assignmentStatus: z.enum(['assigned', 'qualified', 'eliminated', 'all']).default('all'),
  
  // Geographic filters
  district: z.string().optional(),
  panchayat: z.string().optional(),
  
  // Sport filters
  sportName: z.string().optional(),
  genderCategory: z.enum(['men', 'women', 'mixed', 'all']).default('all'),
  
  // Team status
  teamStatus: z.enum(['draft', 'submitted', 'verified', 'active', 'all']).default('all'),
  
  // Check-in status
  checkedIn: z.boolean().optional(),
  matchDayStatus: z.enum(['pending', 'present', 'absent', 'all']).default('all'),
  
  // Date filters
  assignedAfter: z.string().optional(),
  assignedBefore: z.string().optional(),
  
  // Sorting
  sortBy: z.enum(['assignedAt', 'teamName', 'venueId', 'currentLevel']).default('assignedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const BulkAssignmentSchema = z.object({
  assignments: z.array(z.object({
    teamId: z.string().min(1),
    venueId: z.string().min(1),
    level: z.enum(['cluster', 'division', 'final']),
    tournamentNumber: z.number().min(1).optional()
  })).min(1).max(100),
  assignedBy: z.string().min(1),
  assignmentDate: z.string().optional()
});

export async function getAdminVenues(
  filters: z.infer<typeof AdminVenueFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = AdminVenueFiltersSchema.parse(filters);
    
    // Build optimized venue query
    let venuesQuery: any = adminDb.collection('venues');
    const appliedFilters: string[] = [];
    
    // Level filter (most selective) - using 'type' field in venues collection
    if (validatedFilters.level !== 'all') {
      venuesQuery = venuesQuery.where('type', '==', validatedFilters.level);
      appliedFilters.push('level');
    }
    
    // Geographic filters
    if (validatedFilters.district) {
      venuesQuery = venuesQuery.where('district', '==', validatedFilters.district);
      appliedFilters.push('district');
    }
    
    if (validatedFilters.state) {
      venuesQuery = venuesQuery.where('state', '==', validatedFilters.state);
      appliedFilters.push('state');
    }
    
    // Active status filter
    if (validatedFilters.isActive !== undefined) {
      venuesQuery = venuesQuery.where('isActive', '==', validatedFilters.isActive);
      appliedFilters.push('isActive');
    }
    
    // Venue type filter (skipped - conflicts with level filter on 'type' field)
    // Note: Our venues only have type: cluster|division|final, not venue categories
    // if (validatedFilters.venueType !== 'all') {
    //   venuesQuery = venuesQuery.where('venueCategory', '==', validatedFilters.venueType);
    //   appliedFilters.push('venueType');
    // }
    
    // Execute venue query
    const venuesSnapshot = await venuesQuery.get();
    
    // Get team assignment data for each venue
    const venueIds = venuesSnapshot.docs.map((doc: any) => doc.id);
    const assignmentsMap = new Map();
    
    if (venueIds.length > 0) {
      // Batch query team assignments
      const assignmentsQuery = await adminDb.collection('teamVenueAssignment')
        .where('venueId', 'in', venueIds.slice(0, 10)) // Firestore 'in' limit
        .get();
      
      assignmentsQuery.docs.forEach(doc => {
        const data = doc.data();
        const venueId = data.venueId;
        if (!assignmentsMap.has(venueId)) {
          assignmentsMap.set(venueId, []);
        }
        assignmentsMap.get(venueId).push(data);
      });
    }
    
    // Process venues with assignment data
    let venues = venuesSnapshot.docs.map((doc: any) => {
      const venueData = doc.data();
      const assignments = assignmentsMap.get(doc.id) || [];
      
      return {
        id: doc.id,
        ...venueData,
        assignedTeams: assignments.length,
        assignments: assignments,
        createdAt: venueData.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: venueData.updatedAt?.toDate?.()?.toISOString() || null
      };
    });
    
    // Apply client-side filters
    if (validatedFilters.minCapacity !== undefined) {
      venues = venues.filter((venue: any) => ((venue as any).capacity || 0) >= validatedFilters.minCapacity!);
    }
    
    if (validatedFilters.maxCapacity !== undefined) {
      venues = venues.filter((venue: any) => ((venue as any).capacity || 0) <= validatedFilters.maxCapacity!);
    }
    
    if (validatedFilters.hasAssignedTeams !== undefined) {
      venues = venues.filter((venue: any) => {
        const hasTeams = venue.assignedTeams > 0;
        return validatedFilters.hasAssignedTeams ? hasTeams : !hasTeams;
      });
    }
    
    if (validatedFilters.supportedSports && validatedFilters.supportedSports.length > 0) {
      venues = venues.filter((venue: any) => {
        const venueSports = (venue as any).supportedSports || [];
        return validatedFilters.supportedSports!.some(sport => venueSports.includes(sport));
      });
    }
    
    if (validatedFilters.assignmentStatus !== 'all') {
      venues = venues.filter((venue: any) => {
        switch (validatedFilters.assignmentStatus) {
          case 'assigned':
            return venue.assignedTeams > 0;
          case 'unassigned':
            return venue.assignedTeams === 0;
          case 'partial':
            return venue.assignedTeams > 0 && venue.assignedTeams < ((venue as any).capacity || 0);
          default:
            return true;
        }
      });
    }
    
    if (validatedFilters.searchQuery) {
      const searchLower = validatedFilters.searchQuery.toLowerCase();
      venues = venues.filter((venue: any) =>
        (venue as any).name?.toLowerCase().includes(searchLower) ||
        (venue as any).address?.toLowerCase().includes(searchLower) ||
        (venue as any).district?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort venues
    venues.sort((a: any, b: any) => {
      let aValue: any, bValue: any;
      
      switch (validatedFilters.sortBy) {
        case 'capacity':
          aValue = (a as any).capacity || 0;
          bValue = (b as any).capacity || 0;
          break;
        case 'assignedTeams':
          aValue = a.assignedTeams || 0;
          bValue = b.assignedTeams || 0;
          break;
        case 'district':
          aValue = (a as any).district || '';
          bValue = (b as any).district || '';
          break;
        default: // name
          aValue = (a as any).name || '';
          bValue = (b as any).name || '';
      }
      
      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return validatedFilters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Pagination
    const startIndex = validatedFilters.offset;
    const endIndex = startIndex + validatedFilters.limit;
    const paginatedVenues = venues.slice(startIndex, endIndex);
    
    // Optimize venue data for transfer
    const optimizedVenues = paginatedVenues.map((venue: any) => ({
      id: venue.id,
      name: venue.name,
      level: venue.level,
      type: venue.type,
      district: venue.district,
      taluk: venue.taluk,
      address: venue.address,
      capacity: venue.capacity,
      supportedSports: venue.supportedSports,
      assignedTeams: venue.assignedTeams,
      isActive: venue.isActive,
      contactPerson: venue.contactPerson,
      phone: venue.phone,
      facilities: venue.facilities,
      createdAt: venue.createdAt,
      updatedAt: venue.updatedAt
    }));
    
    return {
      success: true,
      venues: optimizedVenues,
      pagination: {
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        count: optimizedVenues.length,
        total: venues.length,
        hasMore: endIndex < venues.length
      },
      appliedFilters,
      meta: {
        queryOptimized: appliedFilters.length > 0,
        totalAssignments: Array.from(assignmentsMap.values()).flat().length
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`,
        venues: []
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch venues',
      venues: []
    };
  }
}

export async function getTeamAssignments(
  filters: z.infer<typeof TeamAssignmentFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedFilters = TeamAssignmentFiltersSchema.parse(filters);
    
    // Build team assignment query
    let assignmentsQuery: any = adminDb.collection('teamVenueAssignment');
    const appliedFilters: string[] = [];
    
    // Venue filter
    if (validatedFilters.venueId) {
      assignmentsQuery = assignmentsQuery.where('venueId', '==', validatedFilters.venueId);
      appliedFilters.push('venueId');
    }
    
    // Level filter
    if (validatedFilters.currentLevel !== 'all') {
      assignmentsQuery = assignmentsQuery.where('currentLevel', '==', validatedFilters.currentLevel);
      appliedFilters.push('currentLevel');
    }
    
    // Check-in status
    if (validatedFilters.checkedIn !== undefined) {
      assignmentsQuery = assignmentsQuery.where('checkedIn', '==', validatedFilters.checkedIn);
      appliedFilters.push('checkedIn');
    }
    
    // Date filters
    if (validatedFilters.assignedAfter) {
      assignmentsQuery = assignmentsQuery.where('assignedAt', '>=', new Date(validatedFilters.assignedAfter));
      appliedFilters.push('assignedAfter');
    }
    
    if (validatedFilters.assignedBefore) {
      assignmentsQuery = assignmentsQuery.where('assignedAt', '<=', new Date(validatedFilters.assignedBefore));
      appliedFilters.push('assignedBefore');
    }
    
    // Execute assignments query
    const assignmentsSnapshot = await assignmentsQuery
      .orderBy(validatedFilters.sortBy, validatedFilters.sortOrder)
      .limit(validatedFilters.limit * 2) // Buffer for client-side filtering
      .offset(validatedFilters.offset)
      .get();
    
    // Get team and venue data
    const teamIds = Array.from(new Set(assignmentsSnapshot.docs.map((doc: any) => doc.data().teamId))) as string[];
    const venueIds = Array.from(new Set(assignmentsSnapshot.docs.map((doc: any) => doc.data().venueId))) as string[];
    
    const [teamsMap, venuesMap] = await Promise.all([
      getTeamsMap(teamIds),
      getVenuesMap(venueIds)
    ]);
    
    // Process assignments with related data
    let assignments = assignmentsSnapshot.docs.map((doc: any) => {
      const assignmentData = doc.data();
      const teamData = teamsMap.get(assignmentData.teamId);
      const venueData = venuesMap.get(assignmentData.venueId);
      
      return {
        id: doc.id,
        ...assignmentData,
        assignedAt: assignmentData.assignedAt?.toDate?.()?.toISOString() || null,
        updatedAt: assignmentData.updatedAt?.toDate?.()?.toISOString() || null,
        team: teamData ? {
          id: assignmentData.teamId,
          name: teamData.name,
          sportName: teamData.sportName,
          status: teamData.status,
          genderCategory: teamData.genderCategory,
          panchayat: teamData.panchayat,
          district: teamData.district,
          currentPlayers: teamData.currentPlayers
        } : null,
        venue: venueData ? {
          id: assignmentData.venueId,
          name: venueData.name,
          level: venueData.level,
          district: venueData.district,
          capacity: venueData.capacity
        } : null
      };
    });
    
    // Apply client-side filters
    if (validatedFilters.district) {
      assignments = assignments.filter((assignment: any) => 
        assignment.team?.district === validatedFilters.district ||
        assignment.venue?.district === validatedFilters.district
      );
    }
    
    if (validatedFilters.panchayat) {
      assignments = assignments.filter((assignment: any) => 
        assignment.team?.panchayat === validatedFilters.panchayat
      );
    }
    
    if (validatedFilters.sportName) {
      assignments = assignments.filter((assignment: any) => 
        assignment.team?.sportName === validatedFilters.sportName
      );
    }
    
    if (validatedFilters.genderCategory !== 'all') {
      assignments = assignments.filter((assignment: any) => 
        assignment.team?.genderCategory === validatedFilters.genderCategory
      );
    }
    
    if (validatedFilters.teamStatus !== 'all') {
      assignments = assignments.filter((assignment: any) => 
        assignment.team?.status === validatedFilters.teamStatus
      );
    }
    
    if (validatedFilters.matchDayStatus !== 'all') {
      assignments = assignments.filter((assignment: any) => 
        assignment.matchDayStatus === validatedFilters.matchDayStatus
      );
    }
    
    // Final pagination after client-side filtering
    const finalAssignments = assignments.slice(0, validatedFilters.limit);
    
    return {
      success: true,
      assignments: finalAssignments,
      pagination: {
        limit: validatedFilters.limit,
        offset: validatedFilters.offset,
        count: finalAssignments.length,
        total: assignments.length,
        hasMore: finalAssignments.length === validatedFilters.limit
      },
      appliedFilters,
      meta: {
        queryOptimized: appliedFilters.length > 0,
        teamsLoaded: teamIds.length,
        venuesLoaded: venueIds.length
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`,
        assignments: []
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch team assignments',
      assignments: []
    };
  }
}

export async function bulkAssignTeamsToVenues(
  request: z.infer<typeof BulkAssignmentSchema>,
  requestingUserId: string
) {
  try {
    // Validate admin permissions
    const userDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const validatedRequest = BulkAssignmentSchema.parse(request);
    const { assignments, assignedBy, assignmentDate } = validatedRequest;
    
    // Validate all teams and venues exist
    const teamIds = assignments.map(a => a.teamId);
    const venueIds = Array.from(new Set(assignments.map((a: any) => a.venueId)));
    
    const [teamsMap, venuesMap] = await Promise.all([
      getTeamsMap(teamIds),
      getVenuesMap(venueIds)
    ]);
    
    // Validate assignments
    const validationErrors: string[] = [];
    
    assignments.forEach((assignment, index) => {
      if (!teamsMap.has(assignment.teamId)) {
        validationErrors.push(`Assignment ${index + 1}: Team ${assignment.teamId} not found`);
      }
      if (!venuesMap.has(assignment.venueId)) {
        validationErrors.push(`Assignment ${index + 1}: Venue ${assignment.venueId} not found`);
      }
    });
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation errors: ${validationErrors.join(', ')}`
      };
    }
    
    // Use batches for atomic operations
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchAssignments = assignments.slice(i, i + batchSize);
      
      batchAssignments.forEach(assignment => {
        const teamData = teamsMap.get(assignment.teamId)!;
        const venueData = venuesMap.get(assignment.venueId)!;
        
        // Create/update team venue assignment
        const assignmentRef = adminDb.collection('teamVenueAssignment').doc(assignment.teamId);
        batch.set(assignmentRef, {
          teamId: assignment.teamId,
          venueId: assignment.venueId,
          venueName: venueData.name,
          currentLevel: assignment.level,
          assignmentStatus: 'assigned',
          tournamentNumber: assignment.tournamentNumber || null,
          checkedIn: false,
          matchDayStatus: 'pending',
          assignedBy: assignedBy,
          assignedAt: assignmentDate ? new Date(assignmentDate) : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // Update team document with venue info
        const teamRef = adminDb.collection('teams').doc(assignment.teamId);
        const teamUpdate: any = {
          currentTournamentLevel: assignment.level,
          checkedIn: false,
          matchDayStatus: 'pending',
          tournamentNumber: assignment.tournamentNumber || null,
          updatedAt: FieldValue.serverTimestamp()
        };
        
        // Set level-specific venue fields
        switch (assignment.level) {
          case 'cluster':
            teamUpdate.clusterVenueId = assignment.venueId;
            teamUpdate.clusterVenueName = venueData.name;
            break;
          case 'division':
            teamUpdate.divisionVenueId = assignment.venueId;
            teamUpdate.divisionVenueName = venueData.name;
            break;
          case 'final':
            teamUpdate.finalVenueId = assignment.venueId;
            teamUpdate.finalVenueName = venueData.name;
            break;
        }
        
        batch.update(teamRef, teamUpdate);
      });
      
      batches.push({ batch, assignments: batchAssignments });
    }
    
    // Execute all batches
    const results = await Promise.all(
      batches.map(async ({ batch, assignments: batchAssignments }) => {
        try {
          await batch.commit();
          return { success: true, assignments: batchAssignments };
        } catch (error) {
          return { success: false, error: (error as Error).message, assignments: batchAssignments };
        }
      })
    );
    
    const successful = results.filter(r => r.success).flatMap(r => r.assignments);
    const failed = results.filter(r => !r.success);
    
    return {
      success: failed.length === 0,
      message: `Successfully assigned ${successful.length} teams${failed.length > 0 ? `, failed to assign ${failed.flatMap(f => f.assignments).length} teams` : ''}`,
      successful: successful.length,
      failed: failed.length,
      details: {
        successful: successful.map(a => ({ teamId: a.teamId, venueId: a.venueId, level: a.level })),
        failed: failed.map(f => ({ 
          error: f.error, 
          assignments: f.assignments.map(a => ({ teamId: a.teamId, venueId: a.venueId }))
        }))
      }
    };

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk assign teams'
    };
  }
}

// Helper functions
async function getTeamsMap(teamIds: string[]): Promise<Map<string, any>> {
  if (teamIds.length === 0) return new Map();
  
  const teamsMap = new Map();
  const batchSize = 10; // Firestore 'in' query limit
  
  for (let i = 0; i < teamIds.length; i += batchSize) {
    const batchIds = teamIds.slice(i, i + batchSize);
    const teamsSnapshot = await adminDb.collection('teams')
      .where('__name__', 'in', batchIds.map(id => adminDb.collection('teams').doc(id)))
      .get();
    
    teamsSnapshot.docs.forEach(doc => {
      teamsMap.set(doc.id, doc.data());
    });
  }
  
  return teamsMap;
}

async function getVenuesMap(venueIds: string[]): Promise<Map<string, any>> {
  if (venueIds.length === 0) return new Map();
  
  const venuesMap = new Map();
  const batchSize = 10; // Firestore 'in' query limit
  
  for (let i = 0; i < venueIds.length; i += batchSize) {
    const batchIds = venueIds.slice(i, i + batchSize);
    const venuesSnapshot = await adminDb.collection('venues')
      .where('__name__', 'in', batchIds.map(id => adminDb.collection('venues').doc(id)))
      .get();
    
    venuesSnapshot.docs.forEach(doc => {
      venuesMap.set(doc.id, doc.data());
    });
  }
  
  return venuesMap;
}