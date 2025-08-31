import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const fixturesRouter = createTRPCRouter({
  getUpcomingMatches: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(5),
    }))
    .query(async ({ input, ctx }) => {
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
          status: {
            in: ['scheduled', 'in_progress'],
          },
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
        orderBy: { createdAt: 'asc' },
        take: input.limit,
      })

      return matches
    }),

  getTeamFixtures: protectedProcedure.query(async ({ ctx }) => {
    const team = await db.team.findFirst({
      where: { captainId: ctx.user.id },
      select: { id: true },
    })

    if (!team) {
      return []
    }

    const fixtures = await db.fixture.findMany({
      where: {
        fixtureTeams: {
          some: {
            teamId: team.id,
          },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        sport: {
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

    return fixtures
  }),
});
