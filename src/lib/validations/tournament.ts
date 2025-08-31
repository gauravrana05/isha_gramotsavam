import { z } from 'zod'
import {
  eventStatusSchema,
  genderCategorySchema,
  fixtureStatusSchema,
  matchStatusSchema,
  tournamentLevelSchema,
  paginationSchema,
  sortOrderSchema,
  dateRangeSchema,
  uuidSchema,
} from './common'

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  registrationStartDate: z.coerce.date(),
  registrationEndDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdBy: uuidSchema,
}).refine(
  (data) => data.registrationEndDate >= data.registrationStartDate,
  {
    message: "Registration end date must be after start date",
    path: ["registrationEndDate"],
  }
).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "Event end date must be after start date",
    path: ["endDate"],
  }
)

export const updateEventSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  registrationStartDate: z.coerce.date().optional(),
  registrationEndDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: eventStatusSchema.optional(),
})

// Sport schemas
export const createSportSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mainPlayersCount: z.number().min(1),
  maxSubstitutes: z.number().min(0),
  genderCategories: z.array(genderCategorySchema).min(1),
})

export const updateSportSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  mainPlayersCount: z.number().min(1).optional(),
  maxSubstitutes: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateSportGenderCategoriesSchema = z.object({
  sportId: uuidSchema,
  genderCategories: z.array(genderCategorySchema),
})

// Fixture schemas
export const createFixtureSchema = z.object({
  name: z.string().min(1).max(200),
  eventId: uuidSchema.optional(),
  sportId: uuidSchema,
  venueLevelMappingId: uuidSchema,
  genderCategory: genderCategorySchema,
  level: tournamentLevelSchema,
})

export const updateFixtureSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  status: fixtureStatusSchema.optional(),
})

export const assignTeamsToFixtureSchema = z.object({
  fixtureId: uuidSchema,
  teamIds: z.array(uuidSchema).min(2),
})

export const checkInTeamSchema = z.object({
  fixtureId: uuidSchema,
  teamId: uuidSchema,
  checkedInBy: uuidSchema,
})

// Match schemas
export const createMatchSchema = z.object({
  fixtureId: uuidSchema,
  eventId: uuidSchema.optional(),
  sportId: uuidSchema,
  venueLevelMappingId: uuidSchema,
  genderCategory: genderCategorySchema,
  roundName: z.string().min(1).max(100),
  matchNumber: z.number().min(1),
  team1Id: uuidSchema.optional(),
  team2Id: uuidSchema.optional(),
  dependsOnMatch1Id: uuidSchema.optional(),
  dependsOnMatch2Id: uuidSchema.optional(),
  nextMatchId: uuidSchema.optional(),
  nextSlot: z.enum(['team1', 'team2']).optional(),
})

export const updateMatchSchema = z.object({
  id: uuidSchema,
  team1Id: uuidSchema.optional(),
  team2Id: uuidSchema.optional(),
  status: matchStatusSchema.optional(),
})

export const enterMatchResultSchema = z.object({
  id: uuidSchema,
  winnerId: uuidSchema,
  winnerName: z.string().min(1).max(200),
  team1Score: z.number().min(0),
  team2Score: z.number().min(0),
  scoreDetails: z.string().optional(),
  resultEnteredBy: uuidSchema,
})

// Fixture result schemas
export const createFixtureResultSchema = z.object({
  fixtureId: uuidSchema,
  teamId: uuidSchema,
  position: z.number().min(1),
  qualifiesForNext: z.boolean().default(false),
})

export const updateFixtureResultSchema = z.object({
  id: uuidSchema,
  position: z.number().min(1).optional(),
  qualifiesForNext: z.boolean().optional(),
})

// Query schemas
export const getEventByIdSchema = z.object({
  id: uuidSchema,
  includeVenueMappings: z.boolean().default(false),
  includeFixtures: z.boolean().default(false),
})

export const getEventsSchema = paginationSchema.extend({
  status: eventStatusSchema.optional(),
  createdBy: uuidSchema.optional(),
  search: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  sortBy: z.enum(['createdAt', 'name', 'startDate', 'status']).default('createdAt'),
  sortOrder: sortOrderSchema,
})

export const getSportByIdSchema = z.object({
  id: uuidSchema,
  includeGenderCategories: z.boolean().default(false),
})

export const getSportsSchema = paginationSchema.extend({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'mainPlayersCount']).default('name'),
  sortOrder: sortOrderSchema,
})

export const getFixtureByIdSchema = z.object({
  id: uuidSchema,
  includeTeams: z.boolean().default(false),
  includeMatches: z.boolean().default(false),
  includeResults: z.boolean().default(false),
})

export const getFixturesSchema = paginationSchema.extend({
  eventId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  venueLevelMappingId: uuidSchema.optional(),
  genderCategory: genderCategorySchema.optional(),
  level: tournamentLevelSchema.optional(),
  status: fixtureStatusSchema.optional(),
  sortBy: z.enum(['createdAt', 'name', 'level']).default('createdAt'),
  sortOrder: sortOrderSchema,
})

export const getMatchByIdSchema = z.object({
  id: uuidSchema,
  includeTeams: z.boolean().default(false),
  includeDependencies: z.boolean().default(false),
})

export const getMatchesSchema = paginationSchema.extend({
  fixtureId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  venueLevelMappingId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  status: matchStatusSchema.optional(),
  dateRange: dateRangeSchema.optional(),
  sortBy: z.enum(['createdAt', 'matchNumber', 'status']).default('matchNumber'),
  sortOrder: sortOrderSchema,
})

export const getFixtureResultsSchema = z.object({
  fixtureId: uuidSchema,
  includeTeams: z.boolean().default(false),
})

// Type exports
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type CreateSportInput = z.infer<typeof createSportSchema>
export type UpdateSportInput = z.infer<typeof updateSportSchema>
export type UpdateSportGenderCategoriesInput = z.infer<typeof updateSportGenderCategoriesSchema>
export type CreateFixtureInput = z.infer<typeof createFixtureSchema>
export type UpdateFixtureInput = z.infer<typeof updateFixtureSchema>
export type AssignTeamsToFixtureInput = z.infer<typeof assignTeamsToFixtureSchema>
export type CheckInTeamInput = z.infer<typeof checkInTeamSchema>
export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
export type EnterMatchResultInput = z.infer<typeof enterMatchResultSchema>
export type CreateFixtureResultInput = z.infer<typeof createFixtureResultSchema>
export type UpdateFixtureResultInput = z.infer<typeof updateFixtureResultSchema>
export type GetEventByIdInput = z.infer<typeof getEventByIdSchema>
export type GetEventsInput = z.infer<typeof getEventsSchema>
export type GetSportByIdInput = z.infer<typeof getSportByIdSchema>
export type GetSportsInput = z.infer<typeof getSportsSchema>
export type GetFixtureByIdInput = z.infer<typeof getFixtureByIdSchema>
export type GetFixturesInput = z.infer<typeof getFixturesSchema>
export type GetMatchByIdInput = z.infer<typeof getMatchByIdSchema>
export type GetMatchesInput = z.infer<typeof getMatchesSchema>
export type GetFixtureResultsInput = z.infer<typeof getFixtureResultsSchema>