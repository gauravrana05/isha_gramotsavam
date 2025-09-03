import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const teamsVerificationRouter = createTRPCRouter({
  // Get teams for verification
  getForVerification: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['pending', 'verified', 'rejected']).default('pending'),
      venueId: z.string().optional(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        })
      }

      const where: any = {}
      
      if (input.venueId) {
        where.venueAssignments = {
          some: { venueId: input.venueId },
        }
      }

      const teams = await db.team.findMany({
        where,
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
            where: { verificationStatus: input.status },
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
          _count: {
            select: {
              teamPlayers: true,
            },
          },
        },
        skip: input.offset,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
      })

      return teams
    }),

  // Get team verification details
  getForVerificationDetail: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        })
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
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
              district: true,
              taluk: true,
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
                  district: true,
                  taluk: true,
                },
              },
            },
          },
          teamPhoto: true,
          teamVenueAssignments: true,
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

  // Verify player
  verifyPlayer: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      status: z.enum(['verified', 'rejected']),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        })
      }

      const { teamId, userId, status, remarks } = input

      const teamPlayer = await db.teamPlayer.update({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
        data: {
          verificationStatus: status,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      })

      return teamPlayer
    }),

  // Verify players in bulk
  verifyPlayersBulk: protectedProcedure
    .input(z.object({
      players: z.array(z.object({
        teamId: z.string(),
        userId: z.string(),
        status: z.enum(['verified', 'rejected']),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        })
      }

      const results = await db.$transaction(
        input.players.map(({ teamId, userId, status, remarks }) =>
          db.teamPlayer.update({
            where: {
              teamId_userId: {
                teamId,
                userId,
              },
            },
            data: {
              verificationStatus: status,
            },
          })
        )
      )

      return { verified: results.length }
    }),

  // Submit team for verification
  submitForVerification: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { teamId } = input

      return await db.$transaction(async (tx) => {
        // Get team with players and sport details
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: {
            sport: true,
            teamPlayers: {
              include: {
                user: true,
              },
            },
          },
        })

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          })
        }

        // Verify team ownership
        if (team.captainId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only team captain can submit team for verification',
          })
        }

        // Check if team is already submitted
        if (team.status !== 'draft') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Team has already been submitted',
          })
        }

        // Validate minimum players
        const minPlayers = team.sport.mainPlayersCount || 1
        if (team.teamPlayers.length < minPlayers) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team must have at least ${minPlayers} players`,
          })
        }

        // Update team status
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: { status: 'submitted' },
        })

        return updatedTeam
      })
    }),
});
