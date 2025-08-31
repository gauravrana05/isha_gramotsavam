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
 * Tier 2: District-level cluster venues (single = auto, multiple = auto to first available)
 * Tier 3: Manual assignment by admin (no automatic fallback to random venues)
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

    // Enhanced venue assignment with district/taluk mapping priority
    const locationMapping = await findVenueByLocationMapping(teamLocation, eventId);
    if (locationMapping) {
      const assignment = await createVenueAssignment(teamId, eventId, locationMapping, assignedByUserId, 'auto_assigned');
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${locationMapping.venueName} via location mapping`,
          assignment: {
            venueId: locationMapping.venueId,
            venueName: locationMapping.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned'
          }
        };
      }
    }

    // Fallback: District-level cluster venues (if no specific mappings)
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

    // Tier 3: Manual assignment required - No automatic fallback to random venues
    return {
      success: true,
      message: 'No suitable venues found in team\'s district. Requires manual assignment by admin.',
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
async function findVenueByLocationMapping(location: TeamLocationData, eventId: string) {
  try {
    // Priority 1: Check district mapping first
    const districtMapping = await db.locationClusterMapping.findFirst({
      where: {
        eventId,
        locationType: 'district',
        locationName: location.district,
        state: location.state,
      },
      include: {
        venueLevelMapping: {
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

    if (districtMapping?.venueLevelMapping?.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: districtMapping.clusterVenueMappingId
        }
      });

      const maxCapacity = districtMapping.venueLevelMapping.venue.capacity || districtMapping.venueLevelMapping.maxTeams || 50;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: districtMapping.venueLevelMapping.venue.id,
          venueName: districtMapping.venueLevelMapping.venue.name,
          mappingId: districtMapping.clusterVenueMappingId,
          maxTeams: maxCapacity
        };
      }
    }

    // Priority 2: Check if only one cluster venue in district
    const clusterVenues = await db.venueLevelMapping.findMany({
      where: {
        eventId,
        level: 'cluster',
        isActive: true,
        venue: {
          district: location.district,
          state: location.state,
          isActive: true,
        }
      },
      include: {
        venue: {
          select: { 
            id: true, 
            name: true, 
            capacity: true
          }
        }
      }
    });

    if (clusterVenues.length === 1) {
      const venue = clusterVenues[0];
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: venue.id
        }
      });

      const maxCapacity = venue.venue.capacity || venue.maxTeams || 50;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: venue.venue.id,
          venueName: venue.venue.name,
          mappingId: venue.id,
          maxTeams: maxCapacity
        };
      }
    }

    // Priority 3: Check taluk mapping
    const talukMapping = await db.locationClusterMapping.findFirst({
      where: {
        eventId,
        locationType: 'taluk',
        locationName: location.taluk,
        district: location.district,
        state: location.state,
      },
      include: {
        venueLevelMapping: {
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

    if (talukMapping?.venueLevelMapping?.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: talukMapping.clusterVenueMappingId
        }
      });

      const maxCapacity = talukMapping.venueLevelMapping.venue.capacity || talukMapping.venueLevelMapping.maxTeams || 50;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: talukMapping.venueLevelMapping.venue.id,
          venueName: talukMapping.venueLevelMapping.venue.name,
          mappingId: talukMapping.clusterVenueMappingId,
          maxTeams: maxCapacity
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Location mapping search error:', error);
    return null;
  }
}

/**
 * Tier 2: Find venues by district
 */
async function findVenuesByDistrict(location: TeamLocationData, eventId: string) {
  try {
    // Find all cluster venue mappings in the same district
    const mappings = await db.venueLevelMapping.findMany({
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