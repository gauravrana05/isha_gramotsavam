import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const volunteersVenueRouter = createTRPCRouter({
  // Get venue teams
  getVenueTeams: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      includePlayerCount: z.boolean().default(true),
      status: z.enum(['all', 'verified', 'pending', 'rejected']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId, includePlayerCount, status } = input;

      const where: any = { venueId };
      if (status !== 'all') {
        where.status = status;
      }

      const teams = await db.team.findMany({
        where,
        include: {
          sport: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: includePlayerCount ? {
            select: {
              teamPlayers: true,
            },
          } : false,
        },
        orderBy: { teamName: 'asc' },
      });

      return teams;
    }),

  // Get venue checked-in teams
  getVenueCheckedInTeams: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      eventId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId, eventId } = input;

      const where: any = {
        fixture: {
          event: {
            venueId,
          },
        },
      };

      if (eventId) {
        where.fixture.eventId = eventId;
      }

      const checkIns = await db.teamCheckIn.findMany({
        where,
        include: {
          team: {
            select: {
              id: true,
              teamName: true,
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          fixture: {
            select: {
              id: true,
              scheduledAt: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          checkedInBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
      });

      return checkIns;
    }),

  // Get venue fixtures
  getVenueFixtures: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.date().optional(),
      status: z.enum(['all', 'scheduled', 'ongoing', 'completed']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId, date, status } = input;

      const where: any = {
        event: { venueId },
      };

      if (status !== 'all') {
        where.status = status;
      }

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        where.scheduledAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      const fixtures = await db.fixture.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              sport: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
          },
          team1: {
            select: {
              id: true,
              teamName: true,
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          team2: {
            select: {
              id: true,
              teamName: true,
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return fixtures;
    }),

  // Get venue matches
  getVenueMatches: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.date().optional(),
      status: z.enum(['all', 'scheduled', 'ongoing', 'completed']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId, date, status } = input;

      const where: any = {
        event: { venueId },
      };

      if (status !== 'all') {
        where.status = status;
      }

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        where.scheduledAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      const matches = await db.match.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              sport: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
          },
          team1: {
            select: {
              id: true,
              teamName: true,
            },
          },
          team2: {
            select: {
              id: true,
              teamName: true,
            },
          },
          winnerTeam: {
            select: {
              id: true,
              teamName: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return matches;
    }),

  // Get fixture details
  getFixtureDetails: protectedProcedure
    .input(z.object({
      fixtureId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const fixture = await db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          event: {
            include: {
              sport: true,
              venue: true,
            },
          },
          team1: {
            include: {
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              teamPlayers: {
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
              },
            },
          },
          team2: {
            include: {
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              teamPlayers: {
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
              },
            },
          },
          teamCheckIns: {
            include: {
              team: {
                select: {
                  teamName: true,
                },
              },
              checkedInBy: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!fixture) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fixture not found',
        });
      }

      return fixture;
    }),
});
