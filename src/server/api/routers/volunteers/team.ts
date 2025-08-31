import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

export const volunteersTeamRouter = createTRPCRouter({
  // Get teams assigned to venue
  getVenueTeams: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Get venue level mappings
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      if (venueLevelMappings.length === 0) {
        return [];
      }

      // Get team venue assignments for this venue
      const teamAssignments = await ctx.db.teamVenueAssignment.findMany({
        where: {
          OR: [
            { clusterVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
            { divisionVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
            { finalVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } }
          ]
        },
        include: {
          team: {
            include: {
              sport: true,
              teamPhoto: true,
              captainUser: {
                select: { firstName: true, lastName: true, phone: true }
              }
            }
          }
        }
      });

      return teamAssignments.map(assignment => ({
        ...assignment.team,
        assignmentLevel: assignment.level,
        checkedInAt: assignment.team?.checkedInAt,
        checkedInBy: assignment.team?.checkedInBy
      }));
    }),

  // Check in team
  checkInTeam: protectedProcedure
    .input(z.object({
      teamId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify team is verified first
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId }
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      if (team.status !== 'verified') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Team must be verified before check-in' 
        });
      }

      // Update team status to checked_in
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: {
          status: 'checked_in',
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id
        }
      });

      return { success: true, team: updatedTeam };
    }),

  // Upload team photo
  uploadTeamPhoto: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      photoPath: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Create or update team photo
      const teamPhoto = await ctx.db.teamPhoto.upsert({
        where: { teamId: input.teamId },
        update: {
          photoPath: input.photoPath,
          uploadedBy: ctx.user.id,
          uploadedAt: new Date()
        },
        create: {
          teamId: input.teamId,
          photoPath: input.photoPath,
          uploadedBy: ctx.user.id
        }
      });

      return { success: true, teamPhoto };
    }),

  // Get team details with players
  getTeamDetails: protectedProcedure
    .input(z.object({
      teamId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        include: {
          sport: true,
          teamPhoto: true,
          teamPlayers: {
            include: {
              user: {
                include: {
                  profileImages: true
                }
              }
            },
            orderBy: [
              { position: 'asc' },
              { firstName: 'asc' }
            ]
          },
          captainUser: {
            select: { 
              firstName: true, 
              lastName: true, 
              phone: true,
              profileImages: true
            }
          },
          teamVenueAssignments: {
            include: {
              clusterVenueMapping: {
                include: { venue: true }
              },
              divisionVenueMapping: {
                include: { venue: true }
              },
              finalVenueMapping: {
                include: { venue: true }
              }
            }
          }
        }
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      return team;
    }),

  // Verify team players
  verifyTeamPlayers: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      playerVerifications: z.array(z.object({
        playerId: z.string(),
        status: z.enum(['verified', 'rejected']),
        notes: z.string().optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Update player verification statuses
        for (const verification of input.playerVerifications) {
          await tx.teamPlayer.update({
            where: { id: verification.playerId },
            data: {
              verificationStatus: verification.status,
              verificationNotes: verification.notes
            }
          });
        }

        // Check if all players are verified
        const team = await tx.team.findUnique({
          where: { id: input.teamId },
          include: {
            teamPlayers: true
          }
        });

        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
        }

        const allPlayersVerified = team.teamPlayers.every(
          player => player.verificationStatus === 'verified'
        );

        // Update team status if all players verified
        if (allPlayersVerified && team.status === 'submitted') {
          await tx.team.update({
            where: { id: input.teamId },
            data: {
              status: 'verified',
              verifiedBy: ctx.user.id,
              verifiedAt: new Date()
            }
          });
        }

        return { success: true, allPlayersVerified };
      });
    }),

  // Get teams pending verification
  getTeamsPendingVerification: protectedProcedure
    .input(z.object({
      venueId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        status: 'submitted'
      };

      // If venue specified, filter by venue assignments
      if (input.venueId) {
        const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
          where: { venueId: input.venueId, isActive: true }
        });

        const teamAssignments = await ctx.db.teamVenueAssignment.findMany({
          where: {
            OR: [
              { clusterVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
              { divisionVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } },
              { finalVenueMappingId: { in: venueLevelMappings.map(vlm => vlm.id) } }
            ]
          }
        });

        whereClause.id = { in: teamAssignments.map(ta => ta.teamId) };
      }

      return await ctx.db.team.findMany({
        where: whereClause,
        include: {
          sport: true,
          captainUser: {
            select: { firstName: true, lastName: true, phone: true }
          },
          teamPlayers: {
            where: {
              verificationStatus: 'pending'
            },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    }),

  // Assign tournament numbers
  assignTournamentNumbers: protectedProcedure
    .input(z.object({
      venueLevelMappingId: z.string(),
      sportId: z.string(),
      genderCategory: z.enum(['men', 'women', 'mixed']),
      assignments: z.array(z.object({
        teamId: z.string(),
        number: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate no duplicate numbers
      const numbers = input.assignments.map(a => a.number);
      if (new Set(numbers).size !== numbers.length) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Duplicate tournament numbers not allowed' 
        });
      }

      // Update teams with tournament numbers
      await Promise.all(
        input.assignments.map(assignment =>
          ctx.db.team.update({
            where: { id: assignment.teamId },
            data: {
              tournamentNumber: assignment.number,
              tournamentNumberAssignedAt: new Date(),
              tournamentNumberVenueMappingId: input.venueLevelMappingId
            }
          })
        )
      );

      return { success: true };
    }),

  // Get teams for tournament number assignment
  getTeamsForNumberAssignment: protectedProcedure
    .input(z.object({
      venueLevelMappingId: z.string(),
      sportId: z.string(),
      genderCategory: z.enum(['men', 'women', 'mixed'])
    }))
    .query(async ({ ctx, input }) => {
      // Get team venue assignments for this venue level mapping
      const teamAssignments = await ctx.db.teamVenueAssignment.findMany({
        where: {
          OR: [
            { clusterVenueMappingId: input.venueLevelMappingId },
            { divisionVenueMappingId: input.venueLevelMappingId },
            { finalVenueMappingId: input.venueLevelMappingId }
          ]
        },
        include: {
          team: {
            where: {
              sportId: input.sportId,
              genderCategory: input.genderCategory,
              status: 'checked_in'
            },
            include: {
              sport: true,
              captainUser: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });

      return teamAssignments
        .filter(ta => ta.team)
        .map(ta => ta.team!)
        .sort((a, b) => a.name.localeCompare(b.name));
    })
});
