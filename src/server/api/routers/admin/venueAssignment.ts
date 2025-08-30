import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
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

export const venueAssignmentRouter = createTRPCRouter({
  // Auto-assign venue to team
  assignVenueToTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      eventId: z.string(),
      teamLocation: z.object({
        panchayat: z.string(),
        district: z.string(),
        state: z.string(),
        taluk: z.string(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      return await assignVenueToTeam(
        input.teamId,
        input.teamLocation,
        input.eventId,
        ctx.user.id
      );
    }),

  // Manual venue assignment
  manualAssignVenue: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      eventId: z.string(),
      venueLevelMappingId: z.string(),
      level: z.enum(['cluster', 'division', 'final']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      try {
        // Check if team already has assignment
        const existingAssignment = await db.teamVenueAssignment.findFirst({
          where: { teamId: input.teamId, eventId: input.eventId },
        });

        if (existingAssignment) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Team already has venue assignment' 
          });
        }

        // Verify venue mapping exists and is active
        const venueMapping = await db.venueLevelMapping.findUnique({
          where: { id: input.venueLevelMappingId },
          include: { venue: true },
        });

        if (!venueMapping || !venueMapping.venue.isActive) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Venue mapping not found or inactive' 
          });
        }

        // Check capacity based on level
        const levelField = `${input.level}VenueMappingId` as const;
        const currentAssignments = await db.teamVenueAssignment.count({
          where: {
            eventId: input.eventId,
            [levelField]: input.venueLevelMappingId,
          }
        });

        if (currentAssignments >= (venueMapping.maxTeams || 100)) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Venue is at capacity' 
          });
        }

        // Create assignment data
        const assignmentData: any = {
          teamId: input.teamId,
          eventId: input.eventId,
          level: input.level,
          assignmentMethod: 'manual_assigned',
          assignedBy: ctx.user.id,
          assignedAt: new Date(),
        };

        // Set the appropriate venue mapping ID based on level
        if (input.level === 'cluster') {
          assignmentData.clusterVenueMappingId = input.venueLevelMappingId;
        } else if (input.level === 'division') {
          assignmentData.divisionVenueMappingId = input.venueLevelMappingId;
        } else if (input.level === 'final') {
          assignmentData.finalVenueMappingId = input.venueLevelMappingId;
        }

        // Create assignment
        const assignment = await db.teamVenueAssignment.create({
          data: assignmentData,
          include: {
            clusterVenueMapping: input.level === 'cluster' ? { include: { venue: true } } : undefined,
            divisionVenueMapping: input.level === 'division' ? { include: { venue: true } } : undefined,
            finalVenueMapping: input.level === 'final' ? { include: { venue: true } } : undefined,
          },
        });

        return {
          success: true,
          message: `Team manually assigned to ${venueMapping.venue.name}`,
          assignment,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to assign venue' 
        });
      }
    }),

  // Get available venues for manual assignment
  getAvailableVenues: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      level: z.enum(['cluster', 'division', 'final']),
      district: z.string().optional(),
      state: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        eventId: input.eventId,
        level: input.level,
        isActive: true,
        venue: { isActive: true },
      };

      if (input.district) {
        where.venue.district = input.district;
      }
      if (input.state) {
        where.venue.state = input.state;
      }

      const mappings = await db.venueLevelMapping.findMany({
        where,
        include: {
          venue: true,
        },
        orderBy: [
          { venue: { district: 'asc' } },
          { venue: { name: 'asc' } },
        ],
      });

      // Get current assignments for each venue
      const mappingsWithCounts = await Promise.all(
        mappings.map(async (mapping) => {
          const levelField = `${input.level}VenueMappingId` as const;
          const currentAssignments = await db.teamVenueAssignment.count({
            where: {
              eventId: input.eventId,
              [levelField]: mapping.id,
            },
          });

          return {
            id: mapping.id,
            venue: mapping.venue,
            maxTeams: mapping.maxTeams || 100,
            currentAssignments,
            availableSlots: (mapping.maxTeams || 100) - currentAssignments,
            isAvailable: currentAssignments < (mapping.maxTeams || 100),
          };
        })
      );

      return mappingsWithCounts;
    }),

  // Get team venue assignments
  getTeamAssignments: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      teamId: z.string().optional(),
      district: z.string().optional(),
      status: z.enum(['all', 'assigned', 'unassigned']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const teamWhere: any = {
        eventId: input.eventId,
      };

      if (input.teamId) {
        teamWhere.id = input.teamId;
      }

      if (input.district) {
        teamWhere.captainUser = {
          district: input.district,
        };
      }

      const teams = await db.team.findMany({
        where: teamWhere,
        include: {
          captainUser: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              district: true,
              state: true,
              taluk: true,
              panchayat: true,
            },
          },
          sport: {
            select: {
              name: true,
            },
          },
          teamVenueAssignments: {
            where: { eventId: input.eventId },
            include: {
              clusterVenueMapping: {
                include: { venue: true },
              },
              divisionVenueMapping: {
                include: { venue: true },
              },
              finalVenueMapping: {
                include: { venue: true },
              },
            },
          },
        },
        orderBy: [
          { captainUser: { district: 'asc' } },
          { name: 'asc' },
        ],
      });

      const filteredTeams = teams.filter(team => {
        const hasAssignment = team.teamVenueAssignments.length > 0;
        if (input.status === 'assigned') return hasAssignment;
        if (input.status === 'unassigned') return !hasAssignment;
        return true;
      });

      return filteredTeams;
    }),
});

/**
 * 3-Tier Venue Assignment Logic for Team Creation
 */
async function assignVenueToTeam(
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
          include: { venue: true },
        },
      },
    });

    if (existingAssignment) {
      return {
        success: true,
        message: 'Team already has venue assignment',
        assignment: {
          venueId: existingAssignment.clusterVenueMapping?.venue?.id || '',
          venueName: existingAssignment.clusterVenueMapping?.venue?.name || '',
          assignmentLevel: 'cluster',
          assignmentMethod: 'auto_assigned',
        },
      };
    }

    // Tier 1: Try direct taluk-to-venue mapping
    const talukMapping = await findVenueByTalukMapping(teamLocation, eventId);
    if (talukMapping) {
      const assignment = await createVenueAssignment(
        teamId,
        eventId,
        talukMapping,
        assignedByUserId,
        'auto_assigned'
      );
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${talukMapping.venueName} via taluk mapping`,
          assignment: {
            venueId: talukMapping.venueId,
            venueName: talukMapping.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned',
          },
        };
      }
    }

    // Tier 2: District-level cluster venues
    const districtVenues = await findVenuesByDistrict(teamLocation, eventId);

    if (districtVenues.length === 1) {
      const venue = districtVenues[0];
      const assignment = await createVenueAssignment(
        teamId,
        eventId,
        venue,
        assignedByUserId,
        'auto_assigned'
      );
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${venue.venueName} (only venue in district)`,
          assignment: {
            venueId: venue.venueId,
            venueName: venue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned',
          },
        };
      }
    } else if (districtVenues.length > 1) {
      const venue = districtVenues[0];
      const assignment = await createVenueAssignment(
        teamId,
        eventId,
        venue,
        assignedByUserId,
        'auto_assigned'
      );
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${venue.venueName} (first available in district)`,
          assignment: {
            venueId: venue.venueId,
            venueName: venue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned',
          },
        };
      }
    }

    // Tier 3: Fallback to any available cluster venue
    const fallbackVenue = await findAnyAvailableVenue(teamLocation, eventId);
    if (fallbackVenue) {
      const assignment = await createVenueAssignment(
        teamId,
        eventId,
        fallbackVenue,
        assignedByUserId,
        'auto_assigned'
      );
      if (assignment) {
        return {
          success: true,
          message: `Team assigned to ${fallbackVenue.venueName} (fallback assignment)`,
          assignment: {
            venueId: fallbackVenue.venueId,
            venueName: fallbackVenue.venueName,
            assignmentLevel: 'cluster',
            assignmentMethod: 'auto_assigned',
          },
        };
      }
    }

    return {
      success: true,
      message: 'No suitable venues found. Team created without venue assignment.',
      requiresManualAssignment: true,
    };
  } catch (error) {
    console.error('Venue assignment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown venue assignment error',
    };
  }
}

// Helper functions with correct schema names
async function findVenueByTalukMapping(location: TeamLocationData, eventId: string) {
  try {
    const talukMapping = await db.talukClusterMapping.findFirst({
      where: {
        eventId,
        district: location.district,
        state: location.state,
        taluk: location.taluk,
      },
      include: {
        venueLocationMapping: {
          include: { venue: true },
        },
      },
    });

    if (talukMapping?.venueLocationMapping?.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: talukMapping.clusterVenueMappingId,
        },
      });

      const maxCapacity = talukMapping.venueLocationMapping.maxTeams || 100;
      if (currentAssignments >= maxCapacity) {
        return null;
      }

      return {
        venueId: talukMapping.venueLocationMapping.venue.id,
        venueName: talukMapping.venueLocationMapping.venue.name,
        mappingId: talukMapping.clusterVenueMappingId,
        maxTeams: maxCapacity,
      };
    }
    return null;
  } catch (error) {
    console.error('Taluk mapping search error:', error);
    return null;
  }
}

async function findVenuesByDistrict(location: TeamLocationData, eventId: string) {
  try {
    const mappings = await db.venueLevelMapping.findMany({
      where: {
        eventId,
        isActive: true,
        level: 'cluster',
        venue: {
          district: location.district,
          state: location.state,
          isActive: true,
        },
      },
      include: { venue: true },
    });

    const availableVenues = [];
    for (const mapping of mappings) {
      if (mapping.venue?.isActive) {
        const currentAssignments = await db.teamVenueAssignment.count({
          where: {
            eventId,
            clusterVenueMappingId: mapping.id,
          },
        });

        const maxCapacity = mapping.maxTeams || 100;
        if (currentAssignments < maxCapacity) {
          availableVenues.push({
            venueId: mapping.venue.id,
            venueName: mapping.venue.name,
            mappingId: mapping.id,
            maxTeams: maxCapacity,
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

async function findAnyAvailableVenue(location: TeamLocationData, eventId: string) {
  try {
    const stateMapping = await db.venueLevelMapping.findFirst({
      where: {
        eventId,
        isActive: true,
        level: 'cluster',
        venue: {
          state: location.state,
          isActive: true,
        },
      },
      include: { venue: true },
    });

    if (stateMapping && stateMapping.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: stateMapping.id,
        },
      });

      const maxCapacity = stateMapping.maxTeams || 100;
      if (currentAssignments < maxCapacity) {
        return {
          venueId: stateMapping.venue.id,
          venueName: stateMapping.venue.name,
          mappingId: stateMapping.id,
          maxTeams: maxCapacity,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Fallback venue search error:', error);
    return null;
  }
}

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
        assignedAt: new Date(),
      },
      include: {
        clusterVenueMapping: {
          include: { venue: true },
        },
      },
    });

    return assignment;
  } catch (error) {
    console.error('Create venue assignment error:', error);
    return null;
  }
}
