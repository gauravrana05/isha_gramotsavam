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
      status: z.enum(['all', 'pending', 'verified']).default('all'),
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

      // Find all venue level mappings for this venue
      const venueLevelMappings = await db.venueLevelMapping.findMany({
        where: { 
          venueId,
          isActive: true 
        },
        select: { id: true }
      });

      const venueLevelMappingIds = venueLevelMappings.map(vlm => vlm.id);

      // Get teams through TeamVenueAssignment
      const teams = await db.team.findMany({
        where: {
          teamVenueAssignments: {
            some: {
              OR: [
                { clusterVenueMappingId: { in: venueLevelMappingIds } },
                { divisionVenueMappingId: { in: venueLevelMappingIds } },
                { finalVenueMappingId: { in: venueLevelMappingIds } },
              ],
            },
          },
          ...(status !== 'all' ? { status } : {}),
          deletedAt: null,
        },
        include: {
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          sport: {
            select: {
              id: true,
              name: true,
            },
          },
          teamVenueAssignments: {
            where: {
              OR: [
                { clusterVenueMappingId: { in: venueLevelMappingIds } },
                { divisionVenueMappingId: { in: venueLevelMappingIds } },
                { finalVenueMappingId: { in: venueLevelMappingIds } },
              ],
            },
            include: {
              clusterVenueMapping: {
                select: { level: true }
              },
              divisionVenueMapping: {
                select: { level: true }
              },
              finalVenueMapping: {
                select: { level: true }
              },
            }
          },
          _count: includePlayerCount ? {
            select: {
              teamPlayers: true,
            },
          } : false,
        },
        orderBy: [
          { status: 'asc' },
          { name: 'asc' }
        ],
      });

      // Enhance teams with venue assignment level info
      const enhancedTeams = teams.map(team => {
        const assignment = team.teamVenueAssignments[0];
        let level = 'cluster';
        
        if (assignment) {
          if (assignment.finalVenueMapping) level = 'final';
          else if (assignment.divisionVenueMapping) level = 'division';
          else if (assignment.clusterVenueMapping) level = 'cluster';
        }

        return {
          ...team,
          venueLevel: level,
          playerCount: team._count?.teamPlayers || 0
        };
      });


      return enhancedTeams;
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

      let where: any = {
        fixture: {
          venueLevelMapping: {
            venueId: venueId,
          },
        },
      };

      if (eventId) {
        where = {
          fixture: {
            venueLevelMapping: {
              venueId: venueId,
            },
            eventId: eventId,
          },
        };
      }

      const checkIns = await db.fixtureTeam.findMany({
        where,
        include: {
          team: {
            select: {
              id: true,
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
              createdAt: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
      status: z.enum(['all', 'pending', 'completed']).default('all'),
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
        venueLevelMapping: { venueId },
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
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return fixtures;
    }),

  // Get venue matches
  getVenueMatches: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      fixtureId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Check volunteer permissions
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId, fixtureId } = input;

      const where: any = {
        venueLevelMapping: { venueId },
        team1: { isNot: null },
        team2: { isNot: null },
      };

      if (fixtureId) {
        where.fixtureId = fixtureId;
      }

      const matches = await db.match.findMany({
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
          fixture: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { matchNumber: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      return matches.map(match => ({
        id: match.id,
        roundName: match.roundName,
        status: match.status,
        team1Name: match.team1?.name || 'TBD',
        team2Name: match.team2?.name || 'TBD',
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        scheduledTime: null, // Add if you have scheduled time field
        actualStartTime: null, // Add if you have actual start time field
        completedTime: match.status === 'completed' ? match.updatedAt.toISOString() : null,
        fixtureId: match.fixtureId,
        fixtureName: match.fixture.name,
      }));
    }),

  // Get fixture details
  getFixtureDetails: protectedProcedure
    .input(z.object({
      fixtureId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
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
            select: {
              id: true,
              name: true,
            },
          },
          fixtureTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
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

      return {
        ...fixture,
        assignedTeams: fixture.fixtureTeams,
      };
    }),

  getVenueMediaAndPosts: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId } = input;

      const venueMedia = await db.media.findMany({
        where: {
          entityType: 'venue',
          entityId: venueId,
        },
      });

      const fixtures = await db.fixture.findMany({
        where: {
          venueLevelMapping: { venueId: venueId },
        },
        select: { id: true },
      });
      const fixtureIds = fixtures.map(f => f.id);

      const matches = await db.match.findMany({
        where: {
          fixtureId: { in: fixtureIds },
        },
        select: { id: true },
      });
      const matchIds = matches.map(m => m.id);

      const posts = await db.post.findMany({
        where: {
          OR: [
            { entityType: 'fixture', entityId: { in: fixtureIds } },
            { entityType: 'match', entityId: { in: matchIds } },
          ],
        },
        include: {
          media: true,
          author: true,
        },
      });

      return {
        venueMedia,
        posts,
      };
    }),

  getVenuePosts: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!['admin', 'general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const { venueId } = input;

      const fixtures = await db.fixture.findMany({
        where: {
          venueLevelMapping: { venueId: venueId },
        },
        select: { id: true },
      });
      const fixtureIds = fixtures.map(f => f.id);

      const matches = await db.match.findMany({
        where: {
          fixtureId: { in: fixtureIds },
        },
        select: { id: true },
      });
      const matchIds = matches.map(m => m.id);

      const posts = await db.post.findMany({
        where: {
          OR: [
            { entityType: 'fixture', entityId: { in: fixtureIds } },
            { entityType: 'match', entityId: { in: matchIds } },
          ],
        },
        include: {
          media: true,
          author: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return posts;
    }),
});
