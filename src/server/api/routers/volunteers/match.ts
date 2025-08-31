import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

export const volunteersMatchRouter = createTRPCRouter({
  // Get match details
  getMatchDetails: protectedProcedure
    .input(z.object({
      matchId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          fixture: {
            include: {
              sport: true,
              venueLevelMapping: {
                include: { venue: true }
              }
            }
          },
          team1: true,
          team2: true,
          winner: true,
          nextMatch: {
            select: { id: true, roundName: true }
          }
        }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      return match;
    }),

  // Update match status
  updateMatchStatus: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      status: z.enum(['scheduled', 'ready', 'in_progress', 'completed', 'cancelled'])
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = { status: input.status };

      if (input.status === 'in_progress') {
        updateData.actualStartTime = new Date();
      }

      const match = await ctx.db.match.update({
        where: { id: input.matchId },
        data: updateData
      });

      return { success: true, match };
    }),

  // Record match result
  recordMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      team1Score: z.number(),
      team2Score: z.number(),
      scoreDetails: z.string().optional(),
      winnerId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get match details
        const match = await tx.match.findUnique({
          where: { id: input.matchId },
          include: {
            team1: true,
            team2: true,
            nextMatch: true,
            fixture: true
          }
        });

        if (!match) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
        }

        // Validate winner
        if (input.winnerId !== match.team1Id && input.winnerId !== match.team2Id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Winner must be one of the participating teams' });
        }

        const winner = input.winnerId === match.team1Id ? match.team1 : match.team2;

        // Update match with result
        const updatedMatch = await tx.match.update({
          where: { id: input.matchId },
          data: {
            team1Score: input.team1Score,
            team2Score: input.team2Score,
            scoreDetails: input.scoreDetails,
            winnerId: input.winnerId,
            winnerName: winner?.name,
            status: 'completed',
            resultEnteredBy: ctx.user.id,
            resultEnteredAt: new Date()
          }
        });

        // Update next match if exists
        if (match.nextMatch && match.nextSlot) {
          const nextMatchUpdate: any = {};
          nextMatchUpdate[match.nextSlot] = input.winnerId;
          
          await tx.match.update({
            where: { id: match.nextMatch.id },
            data: nextMatchUpdate
          });

          // Check if next match is ready
          const nextMatch = await tx.match.findUnique({
            where: { id: match.nextMatch.id }
          });

          if (nextMatch?.team1Id && nextMatch?.team2Id && nextMatch.status === 'scheduled') {
            await tx.match.update({
              where: { id: match.nextMatch.id },
              data: { status: 'ready' }
            });
          }
        }

        // Check if fixture is completed
        const remainingMatches = await tx.match.count({
          where: {
            fixtureId: match.fixtureId,
            status: { not: 'completed' }
          }
        });

        if (remainingMatches === 0) {
          // Find final match (no nextMatchId)
          const finalMatch = await tx.match.findFirst({
            where: {
              fixtureId: match.fixtureId,
              nextMatchId: null
            },
            include: { winner: true }
          });

          if (finalMatch?.winner) {
            await tx.fixture.update({
              where: { id: match.fixtureId },
              data: {
                status: 'completed',
                championTeamId: finalMatch.winnerId,
                championTeamName: finalMatch.winner.name,
                completedAt: new Date()
              }
            });
          }
        }

        return { success: true, match: updatedMatch };
      });
    }),

  // Get venue matches by status
  getVenueMatchesByStatus: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      status: z.enum(['scheduled', 'ready', 'in_progress', 'completed']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      const whereClause: any = {
        venueLevelMappingId: { in: venueLevelMappings.map(vlm => vlm.id) }
      };

      if (input.status) {
        whereClause.status = input.status;
      }

      return await ctx.db.match.findMany({
        where: whereClause,
        include: {
          fixture: {
            select: { name: true, sport: { select: { name: true } } }
          },
          team1: { select: { name: true, tournamentNumber: true } },
          team2: { select: { name: true, tournamentNumber: true } },
          winner: { select: { name: true } }
        },
        orderBy: [
          { scheduledTime: 'asc' },
          { matchNumber: 'asc' }
        ]
      });
    }),

  // Schedule match time
  scheduleMatchTime: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      scheduledTime: z.date()
    }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.match.update({
        where: { id: input.matchId },
        data: { scheduledTime: input.scheduledTime }
      });

      return { success: true, match };
    }),

  // Get fixture bracket
  getFixtureBracket: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const matches = await ctx.db.match.findMany({
        where: { fixtureId: input.fixtureId },
        include: {
          team1: { select: { name: true, tournamentNumber: true } },
          team2: { select: { name: true, tournamentNumber: true } },
          winner: { select: { name: true } }
        },
        orderBy: { matchNumber: 'asc' }
      });

      // Group matches by round
      const rounds = matches.reduce((acc, match) => {
        if (!acc[match.roundName]) {
          acc[match.roundName] = [];
        }
        acc[match.roundName].push(match);
        return acc;
      }, {} as Record<string, typeof matches>);

      return { rounds, matches };
    })
});
