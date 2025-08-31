import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const volunteersVerificationRouter = createTRPCRouter({
  // Get team for match day verification
  getTeamForMatchDay: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Check verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        });
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              age: true,
              gender: true,
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
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      return team;
    }),

  // Verify player for match day
  verifyPlayerForMatchDay: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        });
      }

      const { teamId, userId, remarks } = input;

      // Update player verification status
      const teamPlayer = await db.teamPlayer.update({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
        data: {
          verificationStatus: 'verified',
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      return teamPlayer;
    }),

  // Verify players for match day in bulk
  verifyPlayersForMatchDayBulk: protectedProcedure
    .input(z.object({
      players: z.array(z.object({
        teamId: z.string(),
        userId: z.string(),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        });
      }

      const { players } = input;

      const results = await db.$transaction(async (tx) => {
        const updatedPlayers = [];

        for (const player of players) {
          // Update team player verification
          const teamPlayer = await tx.teamPlayer.update({
            where: {
              teamId_userId: {
                teamId: player.teamId,
                userId: player.userId,
              },
            },
            data: {
              verificationStatus: 'verified',
              updatedAt: new Date(),
            },
          });

          updatedPlayers.push(teamPlayer);
        }

        return updatedPlayers;
      });

      return { verified: results.length };
    }),

  // Get teams by IDs
  getTeamsByIds: protectedProcedure
    .input(z.object({
      teamIds: z.array(z.string()),
      includePlayerDetails: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const teams = await db.team.findMany({
        where: {
          id: { in: input.teamIds },
        },
        include: {
          sport: {
            select: {
              name: true,
            },
          },
          captainUser: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          teamPlayers: input.includePlayerDetails ? {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  age: true,
                  gender: true,
                },
              },
            },
          } : false,
          _count: {
            select: {
              teamPlayers: true,
            },
          },
        },
      });

      return teams;
    }),
});
