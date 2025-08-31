import { z } from 'zod'
import {
  tournamentLevelSchema,
  paginationSchema,
  sortOrderSchema,
  uuidSchema,
} from './common'

// Venue schemas
export const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  capacity: z.number().min(1).optional(),
  panchayat: z.string().max(100).optional(),
  taluk: z.string().max(100).optional(),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().max(10).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  facilities: z.string().optional(),
})

export const updateVenueSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  capacity: z.number().min(1).optional(),
  panchayat: z.string().max(100).optional(),
  taluk: z.string().max(100).optional(),
  district: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  pincode: z.string().max(10).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  facilities: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Venue location mapping schemas
export const createVenueLevelMappingSchema = z.object({
  eventId: uuidSchema,
  venueId: uuidSchema,
  tournamentLevel: tournamentLevelSchema,
  maxTeams: z.number().min(1).optional(),
})

export const updateVenueLocationMappingSchema = z.object({
  id: uuidSchema,
  maxTeams: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
})

// Taluk cluster mapping schemas
export const createTalukClusterMappingSchema = z.object({
  eventId: uuidSchema,
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  taluk: z.string().min(1).max(100),
  clusterVenueMappingId: uuidSchema,
})

// Cluster division mapping schemas
export const createClusterDivisionMappingSchema = z.object({
  eventId: uuidSchema,
  state: z.string().min(1).max(100),
  clusterVenueMappingId: uuidSchema,
  divisionVenueMappingId: uuidSchema,
  autoAssigned: z.boolean().default(false),
})

// Query schemas
export const getVenueByIdSchema = z.object({
  id: uuidSchema,
  includeLocationMappings: z.boolean().default(false),
})

export const getVenuesSchema = paginationSchema.extend({
  district: z.string().optional(),
  state: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'capacity', 'district']).default('createdAt'),
  sortOrder: sortOrderSchema,
})

export const getVenueLocationMappingsSchema = z.object({
  eventId: uuidSchema,
  tournamentLevel: tournamentLevelSchema.optional(),
  venueId: uuidSchema.optional(),
})

export const getAvailableVenuesSchema = z.object({
  eventId: uuidSchema,
  tournamentLevel: tournamentLevelSchema,
  district: z.string().optional(),
  state: z.string().optional(),
})

export const getTalukClusterMappingsSchema = z.object({
  eventId: uuidSchema,
  district: z.string().optional(),
  state: z.string().optional(),
})

export const getClusterDivisionMappingsSchema = z.object({
  eventId: uuidSchema,
  state: z.string().optional(),
})

export const getVenueCapacitySchema = z.object({
  venueLevelMappingId: uuidSchema,
  sportId: uuidSchema.optional(),
})

// Type exports
export type CreateVenueInput = z.infer<typeof createVenueSchema>
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>
export type CreateVenueLocationMappingInput = z.infer<typeof createVenueLevelMappingSchema>
export type UpdateVenueLocationMappingInput = z.infer<typeof updateVenueLocationMappingSchema>
export type CreateTalukClusterMappingInput = z.infer<typeof createTalukClusterMappingSchema>
export type CreateClusterDivisionMappingInput = z.infer<typeof createClusterDivisionMappingSchema>
export type GetVenueByIdInput = z.infer<typeof getVenueByIdSchema>
export type GetVenuesInput = z.infer<typeof getVenuesSchema>
export type GetVenueLocationMappingsInput = z.infer<typeof getVenueLocationMappingsSchema>
export type GetAvailableVenuesInput = z.infer<typeof getAvailableVenuesSchema>
export type GetTalukClusterMappingsInput = z.infer<typeof getTalukClusterMappingsSchema>
export type GetClusterDivisionMappingsInput = z.infer<typeof getClusterDivisionMappingsSchema>
export type GetVenueCapacityInput = z.infer<typeof getVenueCapacitySchema>