import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const matchesRouter = createTRPCRouter({
  // Get matches for specific teams (for captain/player views)
  getTeamMatches: protectedProcedure
    .input(z.object({
      teamIds: z.array(z.string())
    }))
    .query(async ({ ctx, input }) => {
      if (input.teamIds.length === 0) {
        return [];
      }

      return await ctx.db.match.findMany({
        where: {
          OR: [
            { team1Id: { in: input.teamIds } },
            { team2Id: { in: input.teamIds } }
          ]
        },
        include: {
          fixture: {
            select: {
              id: true,
              name: true,
              sport: { select: { name: true, displayName: true } },
              venueLevelMapping: {
                select: {
                  venue: { select: { name: true, location: true } }
                }
              }
            }
          },
          team1: { select: { id: true, name: true } },
          team2: { select: { id: true, name: true } },
          winner: { select: { id: true, name: true } }
        },
        orderBy: [
          { scheduledTime: 'asc' },
          { createdAt: 'desc' }
        ]
      });
    }),

  // Get matches for current user's teams (legacy endpoint)
  getUserMatches: protectedProcedure.query(async ({ ctx }) => {
    const team = await db.team.findFirst({
      where: { captainId: ctx.user.id },
      select: { id: true },
    })

    if (!team) {
      return []
    }

    const matches = await db.match.findMany({
      where: {
        OR: [
          { team1Id: team.id },
          { team2Id: team.id },
        ],
      },
      include: {
        team1: {
          select: {
            id: true,
            name: true,
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
          },
        },
        venueLevelMapping: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                address: true,
                district: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return matches
  }),
});
