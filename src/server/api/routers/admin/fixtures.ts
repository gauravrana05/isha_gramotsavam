import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

export const adminFixturesRouter = createTRPCRouter({
  // Get all fixtures with comprehensive filtering
  getAllFixtures: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      venueId: z.string().optional(),
      status: z.enum(['all', 'draft', 'in_progress', 'completed']).default('all'),
      createdBy: z.enum(['all', 'admin', 'volunteer']).default('all'),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.eventId) {
        where.eventId = input.eventId;
      }
      
      if (input.venueId) {
        where.venueLevelMapping = {
          venueId: input.venueId
        };
      }
      
      if (input.status !== 'all') {
        where.status = input.status;
      }

      const [fixtures, totalCount] = await Promise.all([
        ctx.db.fixture.findMany({
          where,
          include: {
            sport: { select: { name: true, displayName: true } },
            venueLevelMapping: {
              include: {
                venue: { select: { name: true, location: true } }
              }
            },
            fixtureTeams: {
              include: {
                team: { select: { name: true } }
              }
            },
            matches: {
              select: { 
                id: true, 
                status: true,
                team1: { select: { name: true } },
                team2: { select: { name: true } }
              }
            },
            _count: {
              select: {
                matches: true,
                fixtureTeams: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        ctx.db.fixture.count({ where }),
      ]);

      return {
        fixtures: fixtures.map(fixture => ({
          ...fixture,
          teamCount: fixture._count.fixtureTeams,
          matchCount: fixture._count.matches,
          completedMatches: fixture.matches.filter(m => m.status === 'completed').length
        })),
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Get fixture statistics
  getFixtureStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const [
        totalFixtures,
        draftFixtures,
        inProgressFixtures,
        completedFixtures,
        totalMatches,
        completedMatches
      ] = await Promise.all([
        ctx.db.fixture.count(),
        ctx.db.fixture.count({ where: { status: 'draft' } }),
        ctx.db.fixture.count({ where: { status: 'in_progress' } }),
        ctx.db.fixture.count({ where: { status: 'completed' } }),
        ctx.db.match.count(),
        ctx.db.match.count({ where: { status: 'completed' } })
      ]);

      return {
        totalFixtures,
        draftFixtures,
        inProgressFixtures,
        completedFixtures,
        totalMatches,
        completedMatches,
        matchCompletionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
      };
    }),

  // Update fixture status (admin override)
  updateFixtureStatus: protectedProcedure
    .input(z.object({
      fixtureId: z.string(),
      status: z.enum(['draft', 'in_progress', 'completed', 'cancelled'])
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const fixture = await ctx.db.fixture.update({
        where: { id: input.fixtureId },
        data: { 
          status: input.status,
          ...(input.status === 'completed' && { completedAt: new Date() })
        }
      });

      return { success: true, fixture };
    }),
});
