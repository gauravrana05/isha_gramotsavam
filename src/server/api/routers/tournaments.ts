import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import {
  createEventSchema,
  updateEventSchema,
  createSportSchema,
  updateSportSchema,
  updateSportGenderCategoriesSchema,
  createFixtureSchema,
  updateFixtureSchema,
  assignTeamsToFixtureSchema,
  checkInTeamSchema,
  createMatchSchema,
  updateMatchSchema,
  enterMatchResultSchema,
  createFixtureResultSchema,
  updateFixtureResultSchema,
  getEventByIdSchema,
  getEventsSchema,
  getSportByIdSchema,
  getSportsSchema,
  getFixtureByIdSchema,
  getFixturesSchema,
  getMatchByIdSchema,
  getMatchesSchema,
  getFixtureResultsSchema,
} from '@/lib/validations/tournament'

export const tournamentsRouter = createTRPCRouter({
  // Events
  events: createTRPCRouter({
    getById: publicProcedure
      .input(getEventByIdSchema)
      .query(async ({ input }) => {
        const { id, includeVenueMappings, includeFixtures } = input

        const event = await db.event.findUnique({
          where: { id },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            venueLocationMappings: includeVenueMappings ? {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
              orderBy: [
                { level: 'asc' },
                { venue: { name: 'asc' } },
              ],
            } : false,
            fixtures: includeFixtures ? {
              include: {
                sport: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                venueLocationMapping: {
                  include: {
                    venue: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    fixtureTeams: true,
                    matches: true,
                  },
                },
              },
              orderBy: [
                { level: 'asc' },
                { sport: { name: 'asc' } },
                { genderCategory: 'asc' },
              ],
            } : false,
          },
        })

        if (!event) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found',
          })
        }

        return event
      }),

    getAll: publicProcedure
      .input(getEventsSchema)
      .query(async ({ input }) => {
        const { page, limit, status, createdBy, search, dateRange, sortBy, sortOrder } = input

        const skip = (page - 1) * limit

        const where: any = {}

        if (status) where.status = status
        if (createdBy) where.createdBy = createdBy
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }
        if (dateRange?.startDate) where.startDate = { gte: dateRange.startDate }
        if (dateRange?.endDate) where.endDate = { lte: dateRange.endDate }

        const [events, total] = await Promise.all([
          db.event.findMany({
            where,
            include: {
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              _count: {
                select: {
                  teams: true,
                  fixtures: true,
                  venueLocationMappings: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
          }),
          db.event.count({ where }),
        ])

        return {
          events,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        }
      }),

    create: adminProcedure
      .input(createEventSchema)
      .mutation(async ({ input }) => {
        try {
          const event = await db.event.create({
            data: input,
            include: {
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          })

          return event
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create event',
          })
        }
      }),

    update: adminProcedure
      .input(updateEventSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input

        try {
          const event = await db.event.update({
            where: { id },
            data: updateData,
          })

          return event
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found',
          })
        }
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        try {
          // Check if event has any teams
          const teamCount = await db.team.count({
            where: { eventId: input.id },
          })

          if (teamCount > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot delete event with registered teams',
            })
          }

          await db.event.delete({
            where: { id: input.id },
          })

          return { success: true }
        } catch (error) {
          if (error instanceof TRPCError) throw error
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found',
          })
        }
      }),
  }),

  // Sports
  sports: createTRPCRouter({
    getById: publicProcedure
      .input(getSportByIdSchema)
      .query(async ({ input }) => {
        const { id, includeGenderCategories } = input

        const sport = await db.sport.findUnique({
          where: { id },
          include: {
            sportGenderCategories: includeGenderCategories,
          },
        })

        if (!sport) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found',
          })
        }

        return sport
      }),

    getAll: publicProcedure
      .input(getSportsSchema)
      .query(async ({ input }) => {
        const { page, limit, isActive, search, sortBy, sortOrder } = input

        const skip = (page - 1) * limit

        const where: any = {}

        if (isActive !== undefined) where.isActive = isActive
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }

        const [sports, total] = await Promise.all([
          db.sport.findMany({
            where,
            include: {
              sportGenderCategories: true,
              _count: {
                select: {
                  teams: true,
                  fixtures: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
          }),
          db.sport.count({ where }),
        ])

        return {
          sports,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        }
      }),

    create: adminProcedure
      .input(createSportSchema)
      .mutation(async ({ input }) => {
        const { genderCategories, ...sportData } = input

        try {
          const sport = await db.sport.create({
            data: {
              ...sportData,
              sportGenderCategories: {
                create: genderCategories.map((category) => ({
                  genderCategory: category,
                })),
              },
            },
            include: {
              sportGenderCategories: true,
            },
          })

          return sport
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create sport',
          })
        }
      }),

    update: adminProcedure
      .input(updateSportSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input

        try {
          const sport = await db.sport.update({
            where: { id },
            data: updateData,
          })

          return sport
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found',
          })
        }
      }),

    updateGenderCategories: adminProcedure
      .input(updateSportGenderCategoriesSchema)
      .mutation(async ({ input }) => {
        const { sportId, genderCategories } = input

        try {
          // Delete existing categories and create new ones
          await db.sportGenderCategory.deleteMany({
            where: { sportId },
          })

          await db.sportGenderCategory.createMany({
            data: genderCategories.map((category) => ({
              sportId,
              genderCategory: category,
            })),
          })

          const sport = await db.sport.findUnique({
            where: { id: sportId },
            include: {
              sportGenderCategories: true,
            },
          })

          return sport
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update gender categories',
          })
        }
      }),
  }),

  // Fixtures
  fixtures: createTRPCRouter({
    getById: publicProcedure
      .input(getFixtureByIdSchema)
      .query(async ({ input }) => {
        const { id, includeTeams, includeMatches, includeResults } = input

        const fixture = await db.fixture.findUnique({
          where: { id },
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
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
            venueLocationMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            fixtureTeams: includeTeams ? {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    captainName: true,
                    currentPlayers: true,
                    currentSubstitutes: true,
                    tournamentNumber: true,
                  },
                },
                checkedInUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { assignedAt: 'asc' },
            } : false,
            matches: includeMatches ? {
              include: {
                team1: {
                  select: {
                    id: true,
                    name: true,
                    tournamentNumber: true,
                  },
                },
                team2: {
                  select: {
                    id: true,
                    name: true,
                    tournamentNumber: true,
                  },
                },
                winner: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { matchNumber: 'asc' },
            } : false,
            fixtureResults: includeResults ? {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    captainName: true,
                    tournamentNumber: true,
                  },
                },
              },
              orderBy: { finalPosition: 'asc' },
            } : false,
          },
        })

        if (!fixture) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fixture not found',
          })
        }

        return fixture
      }),

    getAll: publicProcedure
      .input(getFixturesSchema)
      .query(async ({ input }) => {
        const {
          page,
          limit,
          eventId,
          sportId,
          venueLocationMappingId,
          genderCategory,
          level,
          status,
          sortBy,
          sortOrder,
        } = input

        const skip = (page - 1) * limit

        const where: any = {}

        if (eventId) where.eventId = eventId
        if (sportId) where.sportId = sportId
        if (venueLocationMappingId) where.venueLocationMappingId = venueLocationMappingId
        if (genderCategory) where.genderCategory = genderCategory
        if (level) where.level = level
        if (status) where.status = status

        const [fixtures, total] = await Promise.all([
          db.fixture.findMany({
            where,
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
              venueLocationMapping: {
                include: {
                  venue: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  fixtureTeams: true,
                  matches: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
          }),
          db.fixture.count({ where }),
        ])

        return {
          fixtures,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        }
      }),

    create: adminProcedure
      .input(createFixtureSchema)
      .mutation(async ({ input }) => {
        try {
          const fixture = await db.fixture.create({
            data: input,
            include: {
              sport: true,
              venueLocationMapping: {
                include: {
                  venue: true,
                },
              },
            },
          })

          return fixture
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create fixture',
          })
        }
      }),

    update: adminProcedure
      .input(updateFixtureSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input

        try {
          const fixture = await db.fixture.update({
            where: { id },
            data: updateData,
          })

          return fixture
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fixture not found',
          })
        }
      }),

    assignTeams: adminProcedure
      .input(assignTeamsToFixtureSchema)
      .mutation(async ({ input }) => {
        const { fixtureId, teamIds } = input

        try {
          // Remove existing team assignments
          await db.fixtureTeam.deleteMany({
            where: { fixtureId },
          })

          // Add new team assignments
          await db.fixtureTeam.createMany({
            data: teamIds.map((teamId) => ({
              fixtureId,
              teamId,
            })),
          })

          // Update fixture status
          await db.fixture.update({
            where: { id: fixtureId },
            data: { status: 'teams_assigned' },
          })

          return { success: true, teamsAssigned: teamIds.length }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to assign teams to fixture',
          })
        }
      }),

    checkInTeam: protectedProcedure
      .input(checkInTeamSchema)
      .mutation(async ({ input }) => {
        const { fixtureId, teamId, checkedInBy } = input

        try {
          const fixtureTeam = await db.fixtureTeam.update({
            where: {
              fixtureId_teamId: {
                fixtureId,
                teamId,
              },
            },
            data: {
              checkedIn: true,
              checkedInAt: new Date(),
              checkedInBy,
            },
          })

          return fixtureTeam
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found in fixture',
          })
        }
      }),
  }),

  // Matches
  matches: createTRPCRouter({
    getById: publicProcedure
      .input(getMatchByIdSchema)
      .query(async ({ input }) => {
        const { id, includeTeams, includeDependencies } = input

        const match = await db.match.findUnique({
          where: { id },
          include: {
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
            venueLocationMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            team1: includeTeams ? {
              select: {
                id: true,
                name: true,
                captainName: true,
                tournamentNumber: true,
              },
            } : false,
            team2: includeTeams ? {
              select: {
                id: true,
                name: true,
                captainName: true,
                tournamentNumber: true,
              },
            } : false,
            winner: includeTeams ? {
              select: {
                id: true,
                name: true,
              },
            } : false,
            dependsOnMatch1: includeDependencies,
            dependsOnMatch2: includeDependencies,
            nextMatch: includeDependencies,
            resultEnteredByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })

        if (!match) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          })
        }

        return match
      }),

    getAll: publicProcedure
      .input(getMatchesSchema)
      .query(async ({ input }) => {
        const {
          page,
          limit,
          fixtureId,
          eventId,
          sportId,
          venueLocationMappingId,
          teamId,
          status,
          dateRange,
          sortBy,
          sortOrder,
        } = input

        const skip = (page - 1) * limit

        const where: any = {}

        if (fixtureId) where.fixtureId = fixtureId
        if (eventId) where.eventId = eventId
        if (sportId) where.sportId = sportId
        if (venueLocationMappingId) where.venueLocationMappingId = venueLocationMappingId
        if (teamId) {
          where.OR = [
            { team1Id: teamId },
            { team2Id: teamId },
          ]
        }
        if (status) where.status = status
        if (dateRange?.startDate) where.createdAt = { gte: dateRange.startDate }
        if (dateRange?.endDate) {
          where.createdAt = {
            ...where.createdAt,
            lte: dateRange.endDate,
          }
        }

        const [matches, total] = await Promise.all([
          db.match.findMany({
            where,
            include: {
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
              venueLocationMapping: {
                include: {
                  venue: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              team1: {
                select: {
                  id: true,
                  name: true,
                  tournamentNumber: true,
                },
              },
              team2: {
                select: {
                  id: true,
                  name: true,
                  tournamentNumber: true,
                },
              },
              winner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
          }),
          db.match.count({ where }),
        ])

        return {
          matches,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        }
      }),

    create: adminProcedure
      .input(createMatchSchema)
      .mutation(async ({ input }) => {
        try {
          const match = await db.match.create({
            data: input,
            include: {
              fixture: true,
              sport: true,
            },
          })

          return match
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create match',
          })
        }
      }),

    update: adminProcedure
      .input(updateMatchSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input

        try {
          const match = await db.match.update({
            where: { id },
            data: updateData,
          })

          return match
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          })
        }
      }),

    enterResult: protectedProcedure
      .input(enterMatchResultSchema)
      .mutation(async ({ input }) => {
        const { id, ...resultData } = input

        try {
          const match = await db.match.update({
            where: { id },
            data: {
              ...resultData,
              status: 'completed',
              resultEnteredAt: new Date(),
            },
            include: {
              team1: true,
              team2: true,
              winner: true,
            },
          })

          // If this match has a next match, update the next match with the winner
          if (match.nextMatchId && match.nextSlot) {
            await db.match.update({
              where: { id: match.nextMatchId },
              data: {
                [match.nextSlot === 'team1' ? 'team1Id' : 'team2Id']: match.winnerId,
              },
            })
          }

          return match
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          })
        }
      }),
  }),

  // Fixture Results
  fixtureResults: createTRPCRouter({
    getByFixture: publicProcedure
      .input(getFixtureResultsSchema)
      .query(async ({ input }) => {
        const { fixtureId, includeTeams } = input

        const results = await db.fixtureResult.findMany({
          where: { fixtureId },
          include: {
            team: includeTeams ? {
              select: {
                id: true,
                name: true,
                captainName: true,
                tournamentNumber: true,
                currentPlayers: true,
                currentSubstitutes: true,
              },
            } : false,
          },
          orderBy: { position: 'asc' },
        })

        return results
      }),

    create: adminProcedure
      .input(createFixtureResultSchema)
      .mutation(async ({ input }) => {
        try {
          const result = await db.fixtureResult.create({
            data: input,
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  captainName: true,
                },
              },
            },
          })

          return result
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create fixture result',
          })
        }
      }),

    update: adminProcedure
      .input(updateFixtureResultSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input

        try {
          const result = await db.fixtureResult.update({
            where: { id },
            data: updateData,
          })

          return result
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fixture result not found',
          })
        }
      }),

    bulkCreate: adminProcedure
      .input(z.object({
        fixtureId: z.string().uuid(),
        results: z.array(z.object({
          teamId: z.string().uuid(),
          finalPosition: z.number().min(1),
          qualifiesForNext: z.boolean().default(false),
        })),
      }))
      .mutation(async ({ input }) => {
        const { fixtureId, results } = input

        try {
          // Delete existing results
          await db.fixtureResult.deleteMany({
            where: { fixtureId },
          })

          // Create new results
          const createdResults = await Promise.all(
            results.map((result) =>
              db.fixtureResult.create({
                data: {
                  fixtureId,
                  ...result,
                },
                include: {
                  team: {
                    select: {
                      id: true,
                      name: true,
                      captainName: true,
                    },
                  },
                },
              })
            )
          )

          // Update fixture status to completed
          await db.fixture.update({
            where: { id: fixtureId },
            data: { status: 'completed' },
          })

          return createdResults
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create fixture results',
          })
        }
      }),
  }),
})