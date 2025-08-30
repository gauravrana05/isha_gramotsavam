import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../../trpc'
import { assignVenueToTeam } from '@/lib/services/venueAssignment'
import {
  createTeamSchema,
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
                  age: true,
                  gender: true,
                },
              },
            },
          } : false,
          venueAssignments: includeVenueAssignments ? {
            include: {
              venue: true,
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
        sport: true,
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
        venueAssignments: {
          include: {
            venue: true,
          },
        },
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
    .input(createTeamSchema)
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
              },
            },
          },
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
      const { teamId, photoUrl, description } = input

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
          photoUrl,
          description,
          uploadedById: ctx.user.id,
        },
      })

      return teamPhoto
    }),

  // Create venue assignment
  createVenueAssignment: protectedProcedure
    .input(createTeamVenueAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, venueId, assignedAt } = input

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
          venueId,
          assignedAt,
          assignedById: ctx.user.id,
        },
        include: {
          venue: true,
        },
      })

      return venueAssignment
    }),

  // Update venue assignment
  updateVenueAssignment: protectedProcedure
    .input(updateTeamVenueAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, venueId, assignedAt } = input

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
          venueId,
          assignedAt,
        },
        include: {
          venue: true,
        },
      })

      return updatedAssignment
    }),
});
