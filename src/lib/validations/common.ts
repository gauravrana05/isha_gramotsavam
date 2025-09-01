import { z } from 'zod'

// Common enums
export const userRoleSchema = z.enum([
  'admin',
  'captain',
  'player',
  'general_volunteer',
  'technical_volunteer',
  'verification_volunteer',
  'public',
])

export const verificationTypeSchema = z.enum([
  'document_verification',
  'onground_verification',
])

export const verificationStatusSchema = z.enum(['pending', 'approved', 'rejected'])

export const genderSchema = z.enum(['M', 'F', 'O'])

export const genderCategorySchema = z.enum(['men', 'women', 'mixed'])

export const eventStatusSchema = z.enum([
  'draft',
  'registration_open',
  'registration_closed',
  'active',
  'completed',
  'cancelled',
])

export const teamStatusSchema = z.enum(['draft', 'submitted', 'verified', 'rejected'])

export const playerPositionSchema = z.enum(['main', 'substitute'])

export const tournamentLevelSchema = z.enum(['cluster', 'division', 'final'])

export const fixtureStatusSchema = z.enum([
  'draft',
  'teams_assigned',
  'in_progress',
  'completed',
])

export const matchStatusSchema = z.enum([
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'cancelled',
])

export const assignmentMethodSchema = z.enum(['auto_assigned', 'manual_assigned'])

export const volunteerTypeSchema = z.enum(['general_volunteer', 'technical_volunteer'])

export const assignmentStatusSchema = z.enum([
  'assigned',
  'confirmed',
  'active',
  'completed',
])

export const mediaEntitySchema = z.enum(['match', 'event', 'venue'])

export const mediaStatusSchema = z.enum(['pending', 'approved', 'rejected'])

export const notificationTypeSchema = z.enum([
  'info',
  'success',
  'warning',
  'error',
  'team_invitation',
  'verification_update',
  'match_result',
  'venue_assignment',
])

// Common field validations
export const phoneSchema = z.string().min(10).max(20)
export const emailSchema = z.string().email().optional()
export const pincodeSchema = z.string().min(6).max(10).optional()
export const uuidSchema = z.string().uuid()

// Address schema
export const addressSchema = z.object({
  panchayat: z.string().min(1).max(100).optional(),
  taluk: z.string().min(1).max(100).optional(),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: pincodeSchema,
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Common query filters
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')