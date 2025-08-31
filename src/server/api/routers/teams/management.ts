import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../../trpc'
import { assignVenueToTeam } from '@/lib/services/venueAssignment'
import {
  createTeamSchema,
  publicCreateTeamSchema,
  updateTeamSchema,
  getTeamByIdSchema,
  uploadTeamPhotoSchema,
  createTeamVenueAssignmentSchema,
  updateTeamVenueAssignmentSchema,
} from '@/lib/validations/team'

export const teamsManagementRouter = createTRPCRouter({
  // Get team by ID
  getById: publicProcedure
    .input(getTeamByIdSchema)
    .query(async ({ input }) => {
      const { id, includePhotos, includePlayers, includeVenueAssignments } = input

      const team = await db.team.findUnique({
        where: { id },
        include: {
          sport: true,
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          teamPhoto: includePhotos,
          teamPlayers: includePlayers ? {
            select: {
              id: true,
              userId: true,
              position: true,
              verificationStatus: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  gender: true,
                },
              },
            },
          } : false,
          teamVenueAssignments: includeVenueAssignments ? {
            include: {
              clusterVenueMapping: {
                include: {
                  venue: true,
                },
              },
            },
          } : false,
        },
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      return team
    }),

  // Get my team
  getMyTeam: protectedProcedure.query(async ({ ctx }) => {
    const team = await db.team.findFirst({
      where: { captainId: ctx.user.id },
      include: {
        sport: {
          select: {
            id: true,
            name: true,
          },
        },
        captainUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        teamPlayers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                age: true,
                gender: true,
              },
            },
          },
        },
        teamVenueAssignments: true,
      },
    })

    return team
  }),

  // Get my teams (for users who might be in multiple teams)
  getMyTeams: protectedProcedure.query(async ({ ctx }) => {
    const teams = await db.team.findMany({
      where: {
        OR: [
          { captainId: ctx.user.id },
          { teamPlayers: { some: { userId: ctx.user.id } } },
        ],
      },
      include: {
        sport: true,
        captainUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            teamPlayers: true,
          },
        },
      },
    })

    return teams
  }),

  // Public team registration (for public registration form)
  register: publicProcedure
    .input(publicCreateTeamSchema)
    .mutation(async ({ input }) => {
      // For public registration, we'll need to handle captain creation differently
      // This endpoint should be used when the captain is already authenticated
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Public team registration requires authentication. Please use the protected endpoint.',
      })
    }),

  // Create team
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ input, ctx }) => {
      const team = await db.team.create({
        data: {
          ...input,
          captainId: ctx.user.id,
        },
        include: {
          sport: true,
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      })

      // Automatic venue assignment using 3-tier system
      if (input.eventId) {
        try {
          const venueAssignmentResult = await assignVenueToTeam(
            team.id,
            {
              panchayat: input.panchayat || '',
              district: input.district,
              state: input.state,
              taluk: input.taluk || '',
            },
            input.eventId,
            ctx.user.id
          )
          
          // Log assignment result for admin monitoring
          console.log(`Team ${team.name} venue assignment:`, venueAssignmentResult.message)
        } catch (error) {
          // Don't fail team creation if venue assignment fails
          console.error('Venue assignment failed during team creation:', error)
        }
      }

      return team
    }),

  // Create team and promote user to captain
  createAndPromoteCaptain: protectedProcedure
    .input(publicCreateTeamSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await db.$transaction(async (tx) => {
        // Update user role to captain
        await tx.user.update({
          where: { id: ctx.user.id },
          data: { role: 'captain' },
        })

        // Create team
        const team = await tx.team.create({
          data: {
            ...input,
            captainId: ctx.user.id,
          },
          include: {
            sport: true,
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                age: true,
                gender: true,
                panchayat: true,
                taluk: true,
                district: true,
                state: true,
                pincode: true,
                dateOfBirth: true,
              },
            },
          },
        })

        // Add captain as team player
        await tx.teamPlayer.create({
          data: {
            teamId: team.id,
            userId: ctx.user.id,
            position: 'main',
            firstName: team.captainUser.firstName || 'Unknown',
            lastName: team.captainUser.lastName || 'User',
            phone: team.captainUser.phone || '',
            dateOfBirth: team.captainUser.dateOfBirth || new Date('1990-01-01'),
            age: team.captainUser.age || 25,
            gender: team.captainUser.gender || 'M',
            panchayat: team.captainUser.panchayat || input.panchayat,
            taluk: team.captainUser.taluk || input.taluk,
            district: team.captainUser.district || input.district,
            state: team.captainUser.state || input.state,
            pincode: team.captainUser.pincode || input.pincode || '000000',
            addedBy: 'captain',
            verificationStatus: 'approved', // Captain is auto-approved
          },
        })

        // Update team player count
        await tx.team.update({
          where: { id: team.id },
          data: { currentPlayers: 1 },
        })

        return team
      })

      // Automatic venue assignment using 3-tier system (after transaction)
      if (input.eventId) {
        try {
          const venueAssignmentResult = await assignVenueToTeam(
            result.id,
            {
              panchayat: input.panchayat || '',
              district: input.district,
              state: input.state,
              taluk: input.taluk || '',
            },
            input.eventId,
            ctx.user.id
          )
          
          // Log assignment result for admin monitoring
          console.log(`Team ${result.name} venue assignment:`, venueAssignmentResult.message)
        } catch (error) {
          // Don't fail team creation if venue assignment fails
          console.error('Venue assignment failed during team creation:', error)
        }
      } else {
        // Try to get the current active event for venue assignment
        try {
          const activeEvent = await db.event.findFirst({
            where: {
              status: {
                in: ['active', 'registration_open', 'registration_closed']
              }
            },
            select: { id: true }
          })

          if (activeEvent) {
            const venueAssignmentResult = await assignVenueToTeam(
              result.id,
              {
                panchayat: input.panchayat || '',
                district: input.district,
                state: input.state,
                taluk: input.taluk || '',
              },
              activeEvent.id,
              ctx.user.id
            )
            
            console.log(`Team ${result.name} venue assignment (auto-event):`, venueAssignmentResult.message)
          }
        } catch (error) {
          console.error('Auto venue assignment failed during team creation:', error)
        }
      }

      return result
    }),

  // Update team
  update: protectedProcedure
    .input(updateTeamSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      // Check if user is captain of this team
      const team = await db.team.findUnique({
        where: { id },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own team',
        })
      }

      const updatedTeam = await db.team.update({
        where: { id },
        data: updateData,
        include: {
          sport: true,
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      })

      return updatedTeam
    }),

  // Upload team photo
  uploadPhoto: protectedProcedure
    .input(uploadTeamPhotoSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, photoPath, uploadedBy } = input

      // Check if user is captain of this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only upload photos for your own team',
        })
      }

      const teamPhoto = await db.teamPhoto.create({
        data: {
          teamId,
          photoPath,
          uploadedBy: uploadedBy || ctx.user.id,
        },
      })

      return teamPhoto
    }),

  // Create venue assignment
  createVenueAssignment: protectedProcedure
    .input(createTeamVenueAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, eventId, clusterVenueMappingId, assignedBy } = input

      // Check if user is captain of this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only create venue assignments for your own team',
        })
      }

      const venueAssignment = await db.teamVenueAssignment.create({
        data: {
          teamId,
          eventId,
          clusterVenueMappingId,
          assignedBy,
        },
      })

      return venueAssignment
    }),

  // Update venue assignment
  updateVenueAssignment: protectedProcedure
    .input(updateTeamVenueAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, divisionVenueMappingId, finalVenueMappingId, clusterQualified, divisionQualified, finalQualified } = input

      // Check if user is captain of the team for this assignment
      const assignment = await db.teamVenueAssignment.findUnique({
        where: { id },
        include: {
          team: {
            select: { captainId: true },
          },
        },
      })

      if (!assignment || assignment.team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update venue assignments for your own team',
        })
      }

      const updatedAssignment = await db.teamVenueAssignment.update({
        where: { id },
        data: {
          divisionVenueMappingId,
          finalVenueMappingId,
          clusterQualified,
          divisionQualified,
          finalQualified,
        },
      })

      return updatedAssignment
    }),

  // Add missing methods
  getMyTeamFixtures: protectedProcedure
    .input(z.object({
      fixtureId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const team = await db.team.findFirst({
        where: { captainId: ctx.user.id },
        select: { id: true },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      const where = {
        fixtureTeams: {
          some: {
            teamId: team.id,
          },
        },
        ...(input.fixtureId && { id: input.fixtureId }),
      };

      return await db.fixture.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          fixtureTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  captainUser: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

  getMyTeamMatches: protectedProcedure
    .input(z.object({
      matchId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const team = await db.team.findFirst({
        where: { captainId: ctx.user.id },
        select: { id: true },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      const where = {
        fixtureTeams: {
          some: {
            teamId: team.id,
          },
        },
        status: 'completed' as const,
        ...(input.matchId && { id: input.matchId }),
      };

      return await db.fixture.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          fixtureTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  captainUser: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),
});
