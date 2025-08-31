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

  // Assign volunteers to venue
  assignVolunteersToVenue: protectedProcedure
    .input(z.object({
      volunteerIds: z.array(z.string().uuid()),
      venueLevelMappingId: z.string().uuid(),
      eventId: z.string().uuid().optional(), // If not provided, will use the first ongoing event
      volunteerType: z.enum(['general_volunteer', 'technical_volunteer', 'verification_volunteer']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      try {
        // Get eventId - use provided or find the first ongoing event
        let eventId = input.eventId;
        if (!eventId) {
          const ongoingEvent = await db.event.findFirst({
            where: {
              status: {
                in: ['active', 'registration_open', 'registration_closed']
              }
            },
            select: { id: true }
          });
          
          if (!ongoingEvent) {
            throw new TRPCError({ 
              code: 'NOT_FOUND', 
              message: 'No ongoing event found for volunteer assignment' 
            });
          }
          
          eventId = ongoingEvent.id;
        }

        // Verify venue mapping exists
        const venueMapping = await db.venueLevelMapping.findUnique({
          where: { id: input.venueLevelMappingId },
          include: { venue: true }
        });

        if (!venueMapping || !venueMapping.venue?.isActive) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Venue mapping not found or inactive' 
          });
        }

        // Verify all volunteers exist and have volunteer roles
        const volunteers = await db.user.findMany({
          where: { 
            id: { in: input.volunteerIds },
            role: { in: ['general_volunteer', 'technical_volunteer', 'verification_volunteer'] }
          }
        });

        if (volunteers.length !== input.volunteerIds.length) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Some volunteers not found or do not have volunteer roles' 
          });
        }

        // Check for existing assignments and prepare new ones
        const existingAssignments = await db.volunteerAssignment.findMany({
          where: {
            volunteerId: { in: input.volunteerIds },
            eventId: eventId,
            deletedAt: null
          }
        });

        // Handle both new assignments and updates to existing ones
        const existingVolunteerIds = existingAssignments.map(a => a.volunteerId);
        const newVolunteerIds = input.volunteerIds.filter(id => !existingVolunteerIds.includes(id));

        // Update existing assignments
        const updatedAssignments = await Promise.all(
          existingAssignments.map(async (assignment) => {
            const volunteer = volunteers.find(v => v.id === assignment.volunteerId);
            const assignmentType = input.volunteerType || (volunteer?.role as any) || 'general_volunteer';
            
            // Update user role based on assignment type
            if (assignmentType === 'technical_volunteer' && volunteer?.role !== 'technical_volunteer') {
              await db.user.update({
                where: { id: assignment.volunteerId },
                data: { role: 'technical_volunteer' }
              });
            } else if (assignmentType === 'general_volunteer' && volunteer?.role !== 'general_volunteer') {
              await db.user.update({
                where: { id: assignment.volunteerId },
                data: { role: 'general_volunteer' }
              });
            }
            
            return db.volunteerAssignment.update({
              where: { id: assignment.id },
              data: {
                venueLevelMappingId: input.venueLevelMappingId,
                volunteerType: assignmentType,
                assignedBy: ctx.user.id,
                status: 'assigned'
              }
            });
          })
        );

        // Create new assignments for volunteers without existing assignments
        const assignments = await Promise.all(
          newVolunteerIds.map(async (volunteerId) => {
            const volunteer = volunteers.find(v => v.id === volunteerId);
            const assignmentType = input.volunteerType || (volunteer?.role as any) || 'general_volunteer';
            
            // Update user role based on assignment type
            if (assignmentType === 'technical_volunteer' && volunteer?.role !== 'technical_volunteer') {
              await db.user.update({
                where: { id: volunteerId },
                data: { role: 'technical_volunteer' }
              });
            }
            
            return db.volunteerAssignment.create({
              data: {
                eventId: eventId!,
                volunteerId: volunteerId,
                venueLevelMappingId: input.venueLevelMappingId,
                volunteerType: assignmentType,
                contactPhone: volunteer?.phone,
                assignedBy: ctx.user.id,
                status: 'assigned'
              },
              include: {
                volunteerUser: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                },
                venueLevelMapping: {
                  select: {
                    level: true,
                    venue: {
                      select: {
                        name: true,
                        district: true,
                        taluk: true
                      }
                    }
                  }
                }
              }
            });
          })
        );

        return {
          success: true,
          message: `Successfully assigned ${assignments.length + updatedAssignments.length} volunteer(s) to ${venueMapping.venue.name}`,
          data: {
            newAssignments: assignments.length,
            updatedAssignments: updatedAssignments.length,
            totalRequested: input.volunteerIds.length,
            venueName: venueMapping.venue.name,
            assignments: assignments
          }
        };
      } catch (error) {
        console.error('Volunteer assignment error:', error);
        console.error('Input data:', input);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Failed to assign volunteers to venue: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // Delete volunteer assignment and revert role if needed
  deleteVolunteerAssignment: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      try {
        // Get the assignment to be deleted
        const assignment = await db.volunteerAssignment.findUnique({
          where: { id: input.assignmentId },
          include: {
            volunteerUser: true,
            venueLevelMapping: {
              include: { venue: true }
            }
          }
        });

        if (!assignment) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Volunteer assignment not found' 
          });
        }

        // Delete the assignment
        await db.volunteerAssignment.update({
          where: { id: input.assignmentId },
          data: { deletedAt: new Date() }
        });

        // Check if volunteer has any other technical assignments
        const otherTechnicalAssignments = await db.volunteerAssignment.count({
          where: {
            volunteerId: assignment.volunteerId,
            volunteerType: 'technical_volunteer',
            deletedAt: null,
            id: { not: input.assignmentId }
          }
        });

        // If no other technical assignments and current user is technical_volunteer, revert to general_volunteer
        if (otherTechnicalAssignments === 0 && assignment.volunteerUser.role === 'technical_volunteer') {
          await db.user.update({
            where: { id: assignment.volunteerId },
            data: { role: 'general_volunteer' }
          });
        }

        return {
          success: true,
          message: `Successfully removed volunteer assignment from ${assignment.venueLevelMapping.venue.name}`,
          data: {
            assignmentId: input.assignmentId,
            volunteerName: `${assignment.volunteerUser.firstName} ${assignment.volunteerUser.lastName}`,
            venueName: assignment.venueLevelMapping.venue.name,
            roleReverted: otherTechnicalAssignments === 0 && assignment.volunteerUser.role === 'technical_volunteer'
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to delete volunteer assignment' 
        });
      }
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
    const talukMapping = await db.locationClusterMapping.findFirst({
      where: {
        eventId,
        district: location.district,
        state: location.state,
        locationType: 'taluk',
        locationName: location.taluk,
      },
      include: {
        venueLevelMapping: {
          include: { venue: true },
        },
      },
    });

    if (talukMapping?.venueLevelMapping?.venue?.isActive) {
      const currentAssignments = await db.teamVenueAssignment.count({
        where: {
          eventId,
          clusterVenueMappingId: talukMapping.clusterVenueMappingId,
        },
      });

      const maxCapacity = talukMapping.venueLevelMapping.maxTeams || 100;
      if (currentAssignments >= maxCapacity) {
        return null;
      }

      return {
        venueId: talukMapping.venueLevelMapping.venue.id,
        venueName: talukMapping.venueLevelMapping.venue.name,
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
