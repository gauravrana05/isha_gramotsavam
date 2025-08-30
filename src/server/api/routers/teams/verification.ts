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
    }))
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
    }))
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
          venueAssignments: {
            include: {
              venue: true,
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
          verificationRemarks: remarks,
          verifiedById: ctx.user.id,
          verifiedAt: new Date(),
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
              verificationRemarks: remarks,
              verifiedById: ctx.user.id,
              verifiedAt: new Date(),
            },
          })
        )
      )

      return { verified: results.length }
    }),
});
