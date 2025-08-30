import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const volunteersVerificationRouter = createTRPCRouter({
  // Get team for match day verification
  getTeamForMatchDay: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      fixtureId: z.string().optional(),
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
          sport: true,
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
      status: z.enum(['verified', 'rejected']),
      remarks: z.string().optional(),
      fixtureId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        });
      }

      const { teamId, userId, status, remarks, fixtureId } = input;

      // Update player verification status
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
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      // If fixture is provided, also create match day verification record
      if (fixtureId) {
        await db.matchDayVerification.upsert({
          where: {
            fixtureId_teamId_userId: {
              fixtureId,
              teamId,
              userId,
            },
          },
          update: {
            status,
            remarks,
            verifiedById: ctx.user.id,
            verifiedAt: new Date(),
          },
          create: {
            fixtureId,
            teamId,
            userId,
            status,
            remarks,
            verifiedById: ctx.user.id,
            verifiedAt: new Date(),
          },
        });
      }

      return teamPlayer;
    }),

  // Verify players for match day in bulk
  verifyPlayersForMatchDayBulk: protectedProcedure
    .input(z.object({
      players: z.array(z.object({
        teamId: z.string(),
        userId: z.string(),
        status: z.enum(['verified', 'rejected']),
        remarks: z.string().optional(),
      })),
      fixtureId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification',
        });
      }

      const { players, fixtureId } = input;

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
              verificationStatus: player.status,
              verificationRemarks: player.remarks,
              verifiedById: ctx.user.id,
              verifiedAt: new Date(),
            },
          });

          updatedPlayers.push(teamPlayer);

          // If fixture is provided, also create match day verification record
          if (fixtureId) {
            await tx.matchDayVerification.upsert({
              where: {
                fixtureId_teamId_userId: {
                  fixtureId,
                  teamId: player.teamId,
                  userId: player.userId,
                },
              },
              update: {
                status: player.status,
                remarks: player.remarks,
                verifiedById: ctx.user.id,
                verifiedAt: new Date(),
              },
              create: {
                fixtureId,
                teamId: player.teamId,
                userId: player.userId,
                status: player.status,
                remarks: player.remarks,
                verifiedById: ctx.user.id,
                verifiedAt: new Date(),
              },
            });
          }
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
              category: true,
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
        orderBy: { teamName: 'asc' },
      });

      return teams;
    }),
});
