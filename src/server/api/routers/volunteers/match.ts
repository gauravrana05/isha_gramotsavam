import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';
import { updateOfflineCache } from '@/lib/utils/cacheUpdater';

export const volunteersMatchRouter = createTRPCRouter({
  // Get match details
  getMatchDetails: protectedProcedure
    .input(z.object({
      matchId: z.string()
    }).optional().default({}))
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

      // Update offline cache
      try {
        await updateOfflineCache(ctx.user.id, match, 'match');
      } catch (error) {
        console.warn('Failed to update offline cache for match details:', error);
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

  // Record match result with automatic progression
  recordMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      team1Score: z.number(),
      team2Score: z.number(),
      scoreDetails: z.string().optional(),
      winnerId: z.string(),
      confirmProgression: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get match details with fixture and venue level mapping
        const match = await tx.match.findUnique({
          where: { id: input.matchId },
          include: {
            team1: true,
            team2: true,
            nextMatch: true,
            fixture: {
              include: {
                sport: true,
                venueLevelMapping: {
                  include: { venue: true }
                }
              }
            }
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
        const loser = input.winnerId === match.team1Id ? match.team2 : match.team1;

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
            resultEnteredAt: new Date(),
            progressionConfirmed: input.confirmProgression
          }
        });

        // Update next match if exists (within same tournament)
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

        let levelProgressionInfo = null;

        if (remainingMatches === 0) {
          // Find final match (no nextMatchId) and semi-final (to get runner-up)
          const finalMatch = await tx.match.findFirst({
            where: {
              fixtureId: match.fixtureId,
              nextMatchId: null
            },
            include: { 
              winner: true,
              team1: true,
              team2: true
            }
          });

          const semiFinalsMatches = await tx.match.findMany({
            where: {
              fixtureId: match.fixtureId,
              nextMatchId: finalMatch?.id
            },
            include: {
              winner: true
            }
          });

          if (finalMatch?.winner) {
            // Get runner-up (the other team in final match)
            const runnerUp = finalMatch.team1Id === finalMatch.winnerId ? finalMatch.team2 : finalMatch.team1;

            // Update fixture as completed
            await tx.fixture.update({
              where: { id: match.fixtureId },
              data: {
                status: 'completed',
                championTeamId: finalMatch.winnerId,
                championTeamName: finalMatch.winner.name,
                completedAt: new Date()
              }
            });

            // Handle level progression (cluster → division → final)
            const currentLevel = match.fixture.level;
            let nextLevel: 'division' | 'final' | null = null;
            
            if (currentLevel === 'cluster') {
              nextLevel = 'division';
            } else if (currentLevel === 'division') {
              nextLevel = 'final';
            }

            if (nextLevel && input.confirmProgression) {
              // Check if higher level tournament already exists
              const existingHigherTournament = await tx.fixture.findFirst({
                where: {
                  sportId: match.fixture.sportId,
                  genderCategory: match.fixture.genderCategory,
                  level: nextLevel,
                  venueLevelMapping: {
                    venueId: match.fixture.venueLevelMapping?.venueId
                  }
                }
              });

              if (!existingHigherTournament && finalMatch.winner && runnerUp) {
                // Create higher level tournament with top 2 teams
                const higherLevelFixture = await tx.fixture.create({
                  data: {
                    name: `${match.fixture.sport.name} ${match.fixture.genderCategory} ${nextLevel}`,
                    eventId: match.fixture.eventId,
                    sportId: match.fixture.sportId,
                    venueLevelMappingId: match.fixture.venueLevelMappingId,
                    genderCategory: match.fixture.genderCategory,
                    level: nextLevel,
                    status: 'teams_assigned',
                    parentFixtureId: match.fixtureId
                  }
                });

                // Create FixtureTeam relationships
                await tx.fixtureTeam.createMany({
                  data: [
                    {
                      fixtureId: higherLevelFixture.id,
                      teamId: finalMatch.winnerId,
                      checkedIn: true,
                      checkedInAt: new Date()
                    },
                    {
                      fixtureId: higherLevelFixture.id,
                      teamId: runnerUp.id,
                      checkedIn: true,
                      checkedInAt: new Date()
                    }
                  ]
                });

                // Create the higher level match
                await tx.match.create({
                  data: {
                    fixtureId: higherLevelFixture.id,
                    eventId: match.fixture.eventId,
                    sportId: match.fixture.sportId,
                    venueLevelMappingId: match.fixture.venueLevelMappingId,
                    genderCategory: match.fixture.genderCategory,
                    roundName: nextLevel === 'final' ? 'Championship Final' : 'Division Final',
                    matchNumber: 1,
                    team1Id: finalMatch.winnerId,
                    team2Id: runnerUp.id,
                    status: 'ready'
                  }
                });

                levelProgressionInfo = {
                  nextLevel,
                  fixtureId: higherLevelFixture.id,
                  qualifiedTeams: [
                    { id: finalMatch.winnerId, name: finalMatch.winner.name, position: 'Champion' },
                    { id: runnerUp.id, name: runnerUp.name, position: 'Runner-up' }
                  ]
                };
              }
            } else if (nextLevel && !input.confirmProgression) {
              // Return info for confirmation dialog
              levelProgressionInfo = {
                nextLevel,
                requiresConfirmation: true,
                qualifiedTeams: [
                  { id: finalMatch.winnerId, name: finalMatch.winner.name, position: 'Champion' },
                  { id: runnerUp?.id, name: runnerUp?.name, position: 'Runner-up' }
                ]
              };
            }
          }
        }

        const result = { 
          success: true, 
          match: updatedMatch,
          tournamentCompleted: remainingMatches === 0,
          levelProgression: levelProgressionInfo
        };

        // Update offline cache with fresh match data
        try {
          await updateOfflineCache(ctx.user.id, updatedMatch, 'match');
        } catch (error) {
          console.warn('Failed to update offline cache for match result:', error);
        }

        return result;
      });
    }),

  // Get venue matches by status
  getVenueMatchesByStatus: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      status: z.enum(['scheduled', 'ready', 'in_progress', 'completed']).optional()
    }).optional().default({}))
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

  // Bulk schedule matches
  bulkScheduleMatches: protectedProcedure
    .input(z.object({
      schedules: z.array(z.object({
        matchId: z.string(),
        scheduledTime: z.date()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const updates = await Promise.all(
        input.schedules.map(schedule =>
          ctx.db.match.update({
            where: { id: schedule.matchId },
            data: { scheduledTime: schedule.scheduledTime }
          })
        )
      );

      return { success: true, updatedMatches: updates.length };
    }),

  // Get fixture bracket
  getFixtureBracket: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }).optional().default({}))
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
