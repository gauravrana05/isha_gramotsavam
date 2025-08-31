import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const teamsFixturesRouter = createTRPCRouter({
  // Get my team fixtures
  getMyTeamFixtures: protectedProcedure.query(async ({ ctx }) => {
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
      },
      orderBy: { createdAt: 'asc' },
    })

    return fixtures
  }),

  // Get my team matches
  getMyTeamMatches: protectedProcedure.query(async ({ ctx }) => {
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
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return matches
  }),
});
