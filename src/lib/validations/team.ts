import { z } from 'zod'
import {
  genderCategorySchema,
  teamStatusSchema,
  playerPositionSchema,
  verificationStatusSchema,
  genderSchema,
  phoneSchema,
  paginationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common'

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  eventId: uuidSchema.optional(),
  sportId: uuidSchema,
  captainId: uuidSchema,
  captainName: z.string().min(1).max(200),
  genderCategory: genderCategorySchema,
  panchayat: z.string().min(1).max(100),
  taluk: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().max(10).optional(),
})

// Public team registration schema (without captainId - will be set from auth context)
export const publicCreateTeamSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  eventId: uuidSchema.optional(),
  sportId: uuidSchema,
  captainName: z.string().min(1).max(200),
  genderCategory: genderCategorySchema,
  panchayat: z.string().min(1).max(100),
  taluk: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().max(10).optional(),
})

export const updateTeamSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: teamStatusSchema.optional(),
  currentPlayers: z.number().min(0).optional(),
  currentSubstitutes: z.number().min(0).optional(),
  tournamentNumber: z.number().min(1).optional(),
})

export const verifyTeamSchema = z.object({
  id: uuidSchema,
  status: teamStatusSchema,
  verifiedBy: uuidSchema,
})

// Team player schemas
export const addTeamPlayerSchema = z.object({
  teamId: uuidSchema,
  position: playerPositionSchema,
  // Player data
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneSchema,
  whatsappNumber: phoneSchema.optional(),
  dateOfBirth: z.coerce.date(),
  age: z.number().min(15).max(50),
  gender: genderSchema,
  panchayat: z.string().min(1).max(100),
  taluk: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(1).max(10),
  verificationStatus: verificationStatusSchema.optional(),
})

export const removeTeamPlayerSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
})

export const updateTeamPlayerSchema = z.object({
  id: uuidSchema,
  position: playerPositionSchema.optional(),
  verificationStatus: verificationStatusSchema.optional(),
})

// Team photo schema
export const uploadTeamPhotoSchema = z.object({
  teamId: uuidSchema,
  photoPath: z.string().min(1).max(500),
  uploadedBy: uuidSchema.optional(),
})

// Team venue assignment schemas
export const createTeamVenueAssignmentSchema = z.object({
  teamId: uuidSchema,
  eventId: uuidSchema,
  clusterVenueMappingId: uuidSchema,
  assignedBy: uuidSchema,
})

export const updateTeamVenueAssignmentSchema = z.object({
  id: uuidSchema,
  divisionVenueMappingId: uuidSchema.optional(),
  finalVenueMappingId: uuidSchema.optional(),
  clusterQualified: z.boolean().optional(),
  divisionQualified: z.boolean().optional(),
  finalQualified: z.boolean().optional(),
})

// Query schemas
export const getTeamByIdSchema = z.object({
  id: uuidSchema,
  includePhotos: z.boolean().default(false),
  includePlayers: z.boolean().default(false),
  includeVenueAssignments: z.boolean().default(false),
})

export const getTeamsSchema = paginationSchema.extend({
  sportId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
  genderCategory: genderCategorySchema.optional(),
  status: teamStatusSchema.optional(),
  captainId: uuidSchema.optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'status', 'tournamentNumber']).default('createdAt'),
  sortOrder: sortOrderSchema,
})

export const getTeamPlayersSchema = z.object({
  teamId: uuidSchema,
  position: playerPositionSchema.optional(),
})

export const getTeamsByLocationSchema = z.object({
  district: z.string(),
  state: z.string(),
  taluk: z.string().optional(),
  sportId: uuidSchema.optional(),
  genderCategory: genderCategorySchema.optional(),
})

export const getTeamsByVenueSchema = z.object({
  venueLevelMappingId: uuidSchema,
  sportId: uuidSchema.optional(),
  genderCategory: genderCategorySchema.optional(),
})

// Type exports
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type VerifyTeamInput = z.infer<typeof verifyTeamSchema>
export type AddTeamPlayerInput = z.infer<typeof addTeamPlayerSchema>
export type RemoveTeamPlayerInput = z.infer<typeof removeTeamPlayerSchema>
export type UpdateTeamPlayerInput = z.infer<typeof updateTeamPlayerSchema>
export type UploadTeamPhotoInput = z.infer<typeof uploadTeamPhotoSchema>
export type CreateTeamVenueAssignmentInput = z.infer<typeof createTeamVenueAssignmentSchema>
export type UpdateTeamVenueAssignmentInput = z.infer<typeof updateTeamVenueAssignmentSchema>
export type GetTeamByIdInput = z.infer<typeof getTeamByIdSchema>
export type GetTeamsInput = z.infer<typeof getTeamsSchema>
export type GetTeamPlayersInput = z.infer<typeof getTeamPlayersSchema>
export type GetTeamsByLocationInput = z.infer<typeof getTeamsByLocationSchema>
export type GetTeamsByVenueInput = z.infer<typeof getTeamsByVenueSchema>