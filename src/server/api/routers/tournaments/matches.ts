import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../../trpc'
import {
  checkInTeamSchema,
  enterMatchResultSchema,
} from '@/lib/validations/tournament'

export const tournamentsMatchesRouter = createTRPCRouter({
  // Check in team
  checkInTeam: protectedProcedure
    .input(checkInTeamSchema)
    .mutation(async ({ input, ctx }) => {
      const { fixtureId, teamId } = input

      // Verify user has permission to check in this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      // Check if user is captain or has volunteer permissions
      const hasPermission = 
        team.captainId === ctx.user.id ||
        ['admin', 'technical_volunteer', 'general_volunteer'].includes(ctx.user.role)

      if (!hasPermission) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to check in this team',
        })
      }

      // Check if fixture exists and team is part of it
      const fixture = await db.fixture.findUnique({
        where: { id: fixtureId },
        include: { 
          fixtureTeams: {
            select: { teamId: true }
          }
        },
      })

      if (!fixture) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fixture not found',
        })
      }

      const teamIds = fixture.fixtureTeams.map(ft => ft.teamId)
      if (!teamIds.includes(teamId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Team is not part of this fixture',
        })
      }

      // Create or update check-in record
      const checkIn = await db.fixtureTeam.update({
        where: {
          fixtureId_teamId: {
            fixtureId,
            teamId,
          },
        },
        data: {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id,
        },
      })

      return checkIn
    }),

  // Enter match result
  enterResult: protectedProcedure
    .input(enterMatchResultSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, winnerId, winnerName, team1Score, team2Score, scoreDetails, resultEnteredBy } = input

      // Check if user has permission to enter results
      if (!['admin', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to enter match results',
        })
      }

      // Verify match exists
      const match = await db.match.findUnique({
        where: { id },
        include: {
        },
      })

      if (!match) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found',
        })
      }

      // Validate winner team ID
      if (winnerId && winnerId !== match.team1Id && winnerId !== match.team2Id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Winner team must be one of the participating teams',
        })
      }

      // Update match with result
      const updatedMatch = await db.match.update({
        where: { id },
        data: {
          team1Score,
          team2Score,
          winnerId,
          status: 'completed',
          scoreDetails,
          resultEnteredBy: ctx.user.id,
          resultEnteredAt: new Date(),
        },
      })

      return updatedMatch
    }),

  // Get match by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const match = await db.match.findUnique({
        where: { id: input.id },
      })

      if (!match) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found',
        })
      }

      return match
    }),

  // Get all matches
  getAll: publicProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      eventId: z.string().optional(),
      teamId: z.string().optional(),
      status: z.enum(['scheduled', 'ongoing', 'completed']).optional(),
    }))
    .query(async ({ input }) => {
      const { limit, offset, eventId, teamId, status } = input

      const where: any = {}
      
      if (eventId) {
        where.eventId = eventId
      }
      
      if (teamId) {
        where.OR = [
          { team1Id: teamId },
          { team2Id: teamId },
        ]
      }
      
      if (status) {
        where.status = status
      }

      const matches = await db.match.findMany({
        where,
        include: {
          event: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      })

      return matches
    }),
});
