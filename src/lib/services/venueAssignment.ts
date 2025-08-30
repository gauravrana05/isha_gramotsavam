import { db } from '@/lib/db';

interface TeamLocationData {
  panchayat: string;
  district: string;
  state: string;
  taluk: string;
}

interface VenueAssignmentResult {
  success: boolean;
  assignment?: {
    venueId: string;
    venueName: string;
    assignmentLevel: 'cluster' | 'division' | 'final';
    assignmentMethod: 'auto_assigned' | 'manual_required';
  };
  message: string;
  requiresManualAssignment?: boolean;
}

/**
 * 3-Tier Venue Assignment Logic for Team Creation
 * 
 * Tier 1: Direct taluk → cluster venue mapping (highest priority)
 * Tier 2: District-level cluster venues (single = auto, multiple = manual selection)
 * Tier 3: Fallback to any available cluster venue
 */
export async function assignVenueToTeam(
  teamId: string,
  teamLocation: TeamLocationData,
  eventId: string,
  assignedByUserId: string
): Promise<VenueAssignmentResult> {
  try {
    // Check if team already has a venue assignment
    const existingAssignment = await db.teamVenueAssignment.findFirst({
      where: { teamId, eventId },
      include: {
        clusterVenueMapping: {
          include: {
            venue: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (existingAssignment) {
      return {
        success: true,
        message: 'Team already has venue assignment',
        assignment: {
          venueId: existingAssignment.clusterVenueMapping?.venue?.id || '',
          venueName: existingAssignment.clusterVenueMapping?.venue?.name || '',
          assignmentLevel: 'cluster',
          assignmentMethod: 'auto_assigned'
        }
      };
    }

    // Tier 1: Try direct taluk-to-venue mapping
    const talukMapping = await findVenueByTalukMapping(teamLocation, eventId);
    if (talukMapping) {
      const assignment = await createVenueAssignment(teamId, eventId, talukMapping, assignedByUserId, 'auto_assigned');
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${talukMapping.venueName} via taluk mapping`,
          assignment: {
            venueId: talukMapping.venueId,
            venueName: talukMapping.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned'
          }
        };
      }
    }

    // Tier 2: District-level cluster venues
    const districtVenues = await findVenuesByDistrict(teamLocation, eventId);
    
    if (districtVenues.length === 1) {
      // Single venue in district - auto assign
      const venue = districtVenues[0];
      const assignment = await createVenueAssignment(teamId, eventId, venue, assignedByUserId, 'auto_assigned');
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${venue.venueName} (only venue in district)`,
          assignment: {
            venueId: venue.venueId,
            venueName: venue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned'
          }
        };
      }
    } else if (districtVenues.length > 1) {
      // Multiple venues - for now, assign to first available (can be enhanced later for manual selection)
      const venue = districtVenues[0];
      const assignment = await createVenueAssignment(teamId, eventId, venue, assignedByUserId, 'auto_assigned');
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${venue.venueName} (first available in district)`,
          assignment: {
            venueId: venue.venueId,
            venueName: venue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned'
          }
        };
      }
    }

    // Tier 3: Fallback to any available cluster venue
    const fallbackVenue = await findAnyAvailableVenue(teamLocation, eventId);
    if (fallbackVenue) {
      const assignment = await createVenueAssignment(teamId, eventId, fallbackVenue, assignedByUserId, 'auto_assigned');
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${fallbackVenue.venueName} (fallback assignment)`,
          assignment: {
            venueId: fallbackVenue.venueId,
            venueName: fallbackVenue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned'
          }
        };
      }
    }

    // No venues available - return without assignment (can be handled later)
    return {
      success: true,
      message: 'No suitable venues found. Team created without venue assignment.',
      requiresManualAssignment: true
    };

  } catch (error) {
    console.error('Venue assignment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown venue assignment error'
    };
  }
}

/**
 * Tier 1: Find venue by direct taluk mapping
 */
async function findVenueByTalukMapping(location: TeamLocationData, eventId: string) {
  try {
    // Use TalukClusterMapping to find direct taluk-to-venue mapping
    const talukMapping = await db.talukClusterMapping.findFirst({
      where: {
        eventId,
        district: location.district,
        state: location.state,
        taluk: location.taluk
      },
      include: {
        venueLocationMapping: {
          include: {
            venue: {
              select: { 
                id: true, 
                name: true, 
                isActive: true,
                capacity: true
              }
            }
          }
        }
      }
    });

    if (talukMapping?.venueLocationMapping?.venue?.isActive) {
      // Check venue capacity
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: talukMapping.clusterVenueMappingId
        }
      });

      const maxCapacity = talukMapping.venueLocationMapping.venue.capacity || talukMapping.venueLocationMapping.maxTeams || 50;
      if (currentAssignments >= maxCapacity) {
        return null; // Venue at capacity
      }

      return {
        venueId: talukMapping.venueLocationMapping.venue.id,
        venueName: talukMapping.venueLocationMapping.venue.name,
        mappingId: talukMapping.clusterVenueMappingId,
        maxTeams: maxCapacity
      };
    }
    return null;
  } catch (error) {
    console.error('Taluk mapping search error:', error);
    return null;
  }
}

/**
 * Tier 2: Find venues by district
 */
async function findVenuesByDistrict(location: TeamLocationData, eventId: string) {
  try {
    // Find all cluster venue mappings in the same district
    const mappings = await db.venueLocationMapping.findMany({
      where: {
        eventId,
        isActive: true,
        level: 'cluster',
        venue: {
          district: location.district,
          state: location.state,
          isActive: true
        }
      },
      include: {
        venue: {
          select: { 
            id: true, 
            name: true, 
            isActive: true,
            capacity: true
          }
        }
      }
    });

    const availableVenues = [];
    for (const mapping of mappings) {
      if (mapping.venue?.isActive) {
        // Check capacity
        const currentAssignments = await db.teamVenueAssignment.count({
          where: {
            eventId,
            clusterVenueMappingId: mapping.id
          }
        });

        const maxCapacity = mapping.venue.capacity || mapping.maxTeams || 50;
        if (currentAssignments < maxCapacity) {
          availableVenues.push({
            venueId: mapping.venue.id,
            venueName: mapping.venue.name,
            mappingId: mapping.id,
            maxTeams: maxCapacity
          });
        }
      }
    }

    return availableVenues;
  } catch (error) {
    console.error('District venues search error:', error);
    return [];
  }
}

/**
 * Tier 3: Find any available cluster venue as fallback
 */
async function findAnyAvailableVenue(location: TeamLocationData, eventId: string) {
  try {
    // First try venues in the same state
    const stateMapping = await db.venueLocationMapping.findFirst({
      where: {
        eventId,
        isActive: true,
        level: 'cluster',
        venue: {
          state: location.state,
          isActive: true
        }
      },
      include: {
        venue: {
          select: { 
            id: true, 
            name: true, 
            isActive: true,
            capacity: true
          }
        }
      }
    });

    if (stateMapping && stateMapping.venue?.isActive) {
      // Check capacity
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: stateMapping.id
        }
      });

      const maxCapacity = stateMapping.venue.capacity || stateMapping.maxTeams || 50;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: stateMapping.venue.id,
          venueName: stateMapping.venue.name,
          mappingId: stateMapping.id,
          maxTeams: maxCapacity
        };
      }
    }

    // If no state venues, try any available cluster venue
    const anyMapping = await db.venueLocationMapping.findFirst({
      where: {
        eventId,
        isActive: true,
        level: 'cluster',
        venue: {
          isActive: true
        }
      },
      include: {
        venue: {
          select: { 
            id: true, 
            name: true, 
            isActive: true,
            capacity: true
          }
        }
      }
    });

    if (anyMapping && anyMapping.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: anyMapping.id
        }
      });

      const maxCapacity = anyMapping.venue.capacity || anyMapping.maxTeams || 50;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: anyMapping.venue.id,
          venueName: anyMapping.venue.name,
          mappingId: anyMapping.id,
          maxTeams: maxCapacity
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Fallback venue search error:', error);
    return null;
  }
}

/**
 * Create team venue assignment record
 */
async function createVenueAssignment(
  teamId: string,
  eventId: string,
  venueInfo: { venueId: string; venueName: string; mappingId: string; maxTeams: number },
  assignedByUserId: string,
  assignmentMethod: 'auto_assigned' | 'manual_assigned'
) {
  try {
    const assignment = await db.teamVenueAssignment.create({
      data: {
        teamId,
        eventId,
        level: 'cluster',
        clusterVenueMappingId: venueInfo.mappingId,
        assignmentMethod,
        assignedBy: assignedByUserId,
        assignedAt: new Date()
      },
      include: {
        clusterVenueMapping: {
          include: {
            venue: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return assignment;
  } catch (error) {
    console.error('Create venue assignment error:', error);
    return null;
  }
}