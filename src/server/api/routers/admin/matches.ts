import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const adminMatchesRouter = createTRPCRouter({
  // Get all matches with filtering and pagination
  getMatches: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      venueId: z.string().optional(),
      status: z.enum(['scheduled', 'ready', 'in_progress', 'completed', 'cancelled']).optional(),
      sportId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const { eventId, venueId, status, sportId, limit, offset } = input;

      const where: any = {
        team1: { isNot: null },
        team2: { isNot: null },
      };

      if (eventId) where.eventId = eventId;
      if (status) where.status = status;
      if (sportId) where.sportId = sportId;
      if (venueId) {
        where.venueLevelMapping = { venueId };
      }

      const [matches, totalCount] = await Promise.all([
        db.match.findMany({
          where,
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
            fixture: {
              select: {
                id: true,
                name: true,
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
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { matchNumber: 'asc' },
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        db.match.count({ where }),
      ]);

      return {
        matches: matches.map(match => ({
          id: match.id,
          matchNumber: match.matchNumber,
          status: match.status,
          roundName: match.roundName,
          fixtureName: match.fixture.name,
          sportName: match.sport.name,
          genderCategory: match.genderCategory,
          venueName: match.venueLevelMapping.venue.name,
          team1: {
            teamName: match.team1?.name,
          },
          team2: {
            teamName: match.team2?.name,
          },
          result: match.winnerId ? {
            winnerName: match.winner?.name,
            resultEnteredAt: match.resultEnteredAt,
          } : null,
          createdAt: match.createdAt.toISOString(),
          updatedAt: match.updatedAt.toISOString(),
          resultEnteredAt: match.resultEnteredAt?.toISOString() || null,
        })),
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    }),

  // Get match statistics
  getMatchStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const [
        totalMatches,
        scheduledMatches,
        readyMatches,
        inProgressMatches,
        completedMatches,
      ] = await Promise.all([
        db.match.count({
          where: {
            team1: { isNot: null },
            team2: { isNot: null },
          },
        }),
        db.match.count({
          where: {
            status: 'scheduled',
            team1: { isNot: null },
            team2: { isNot: null },
          },
        }),
        db.match.count({
          where: {
            status: 'ready',
            team1: { isNot: null },
            team2: { isNot: null },
          },
        }),
        db.match.count({
          where: {
            status: 'in_progress',
            team1: { isNot: null },
            team2: { isNot: null },
          },
        }),
        db.match.count({
          where: {
            status: 'completed',
            team1: { isNot: null },
            team2: { isNot: null },
          },
        }),
      ]);

      return {
        totalMatches,
        byStatus: {
          scheduled: scheduledMatches,
          ready: readyMatches,
          in_progress: inProgressMatches,
          completed: completedMatches,
        },
        liveMatches: inProgressMatches,
      };
    }),

  // Get venues for filtering
  getVenues: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const venues = await db.venue.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      return venues;
    }),

  // Get match details
  getMatchDetails: protectedProcedure
    .input(z.object({
      matchId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const match = await db.match.findUnique({
        where: { id: input.matchId },
        include: {
          team1: {
            select: {
              id: true,
              name: true,
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          team2: {
            select: {
              id: true,
              name: true,
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          winner: {
            select: {
              id: true,
              name: true,
            },
          },
          fixture: {
            select: {
              id: true,
              name: true,
              level: true,
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
                },
              },
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          resultEnteredByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!match) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found',
        });
      }

      return match;
    }),
});
