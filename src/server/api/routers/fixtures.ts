import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const fixturesRouter = createTRPCRouter({
  // Get fixtures for specific teams
  getTeamFixtures: protectedProcedure
    .input(z.object({
      teamIds: z.array(z.string())
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      if (input.teamIds.length === 0) {
        return [];
      }

      return await ctx.db.fixture.findMany({
        where: {
          fixtureTeams: {
            some: {
              teamId: { in: input.teamIds }
            }
          }
        },
        include: {
          sport: true,
          venueLevelMapping: {
            include: {
              venue: true
            }
          },
          matches: {
            select: {
              id: true,
              status: true,
              team1Id: true,
              team2Id: true,
              winnerId: true,
              team1Score: true,
              team2Score: true,
              roundName: true,
              matchNumber: true,
              scheduledTime: true,
              actualStartTime: true,
              scoreDetails: true
            },
            orderBy: { matchNumber: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  // Get fixture by ID
  getFixtureById: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const fixture = await ctx.db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          sport: true,
          venueLevelMapping: {
            include: {
              venue: true
            }
          },
          matches: {
            include: {
              team1: {
                select: {
                  id: true,
                  name: true,
                  tournamentNumber: true
                }
              },
              team2: {
                select: {
                  id: true,
                  name: true,
                  tournamentNumber: true
                }
              },
              winner: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { matchNumber: 'asc' }
          }
        }
      });

      if (!fixture) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fixture not found' });
      }

      return fixture;
    })
});
