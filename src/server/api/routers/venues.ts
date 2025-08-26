import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import {
  createVenueSchema,
  updateVenueSchema,
  createVenueLocationMappingSchema,
  updateVenueLocationMappingSchema,
  createTalukClusterMappingSchema,
  createClusterDivisionMappingSchema,
  getVenueByIdSchema,
  getVenuesSchema,
  getVenueLocationMappingsSchema,
  getAvailableVenuesSchema,
  getTalukClusterMappingsSchema,
  getClusterDivisionMappingsSchema,
  getVenueCapacitySchema,
} from '@/lib/validations/venue'

export const venuesRouter = createTRPCRouter({
  // Public procedures
  getById: publicProcedure
    .input(getVenueByIdSchema)
    .query(async ({ input }) => {
      const { id, includeLocationMappings } = input

      const venue = await db.venue.findUnique({
        where: { id },
        include: {
          venueLocationMappings: includeLocationMappings ? {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          } : false,
        },
      })

      if (!venue) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        })
      }

      return venue
    }),

  getAll: publicProcedure
    .input(getVenuesSchema)
    .query(async ({ input }) => {
      const { page, limit, district, state, isActive, search, sortBy, sortOrder } = input

      const skip = (page - 1) * limit

      const where: any = {}

      if (district) where.district = district
      if (state) where.state = state
      if (isActive !== undefined) where.isActive = isActive
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { panchayat: { contains: search, mode: 'insensitive' } },
          { taluk: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [venues, total] = await Promise.all([
        db.venue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        db.venue.count({ where }),
      ])

      return {
        venues,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  getLocationMappings: publicProcedure
    .input(getVenueLocationMappingsSchema)
    .query(async ({ input }) => {
      const { eventId, tournamentLevel, venueId } = input

      const where: any = { eventId }

      if (tournamentLevel) where.tournamentLevel = tournamentLevel
      if (venueId) where.venue_id = venueId

      const mappings = await db.venue_location_mappings.findMany({
        where,
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              capacity: true,
              district: true,
              state: true,
              contactPerson: true,
              contactPhone: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: [
          { tournamentLevel: 'asc' },
          { venue: { name: 'asc' } },
        ],
      })

      return mappings
    }),

  getAvailableVenues: publicProcedure
    .input(getAvailableVenuesSchema)
    .query(async ({ input }) => {
      const { eventId, tournamentLevel, district, state } = input

      const where: any = {
        isActive: true,
      }

      if (district) where.district = district
      if (state) where.state = state

      // Get venues that are not already mapped to this event and tournament level
      const mappedVenueIds = await db.venue_location_mappings.findMany({
        where: {
          eventId,
          tournamentLevel,
        },
        select: { venue_id: true },
      })

      const mappedIds = mappedVenueIds.map((m) => m.venueId)

      if (mappedIds.length > 0) {
        where.id = { notIn: mappedIds }
      }

      const venues = await db.venue.findMany({
        where,
        orderBy: { name: 'asc' },
      })

      return venues
    }),

  getTalukClusterMappings: publicProcedure
    .input(getTalukClusterMappingsSchema)
    .query(async ({ input }) => {
      const { eventId, district, state } = input

      const where: any = { eventId }

      if (district) where.district = district
      if (state) where.state = state

      const mappings = await db.taluk_cluster_mappings.findMany({
        where,
        include: {
          clusterVenueMapping: {
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
        },
        orderBy: [
          { state: 'asc' },
          { district: 'asc' },
          { taluk: 'asc' },
        ],
      })

      return mappings
    }),

  getClusterDivisionMappings: publicProcedure
    .input(getClusterDivisionMappingsSchema)
    .query(async ({ input }) => {
      const { eventId, state } = input

      const where: any = { eventId }

      if (state) where.state = state

      const mappings = await db.cluster_division_mappings.findMany({
        where,
        include: {
          clusterVenueMapping: {
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
          divisionVenueMapping: {
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
        },
        orderBy: [
          { state: 'asc' },
          { clusterVenueMapping: { venue: { name: 'asc' } } },
        ],
      })

      return mappings
    }),

  getVenueCapacity: publicProcedure
    .input(getVenueCapacitySchema)
    .query(async ({ input }) => {
      const { venueLocationMappingId, sportId } = input

      // Get venue mapping details
      const venueMapping = await db.venue_location_mappings.findUnique({
        where: { id: venueLocationMappingId },
        include: {
          venue: true,
        },
      })

      if (!venueMapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue location mapping not found',
        })
      }

      // Count teams assigned to this venue
      const where: any = {
        venueAssignments: {
          some: {
            OR: [
              { clusterVenueMappingId: venueLocationMappingId },
              { divisionVenueMappingId: venueLocationMappingId },
              { finalVenueMappingId: venueLocationMappingId },
            ],
          },
        },
      }

      if (sportId) where.sport_id = sportId

      const assignedTeams = await db.teams.count({ where })

      return {
        venue: venueMapping.venue,
        tournamentLevel: venueMapping.tournamentLevel,
        maxTeams: venueMapping.maxTeams,
        assignedTeams,
        remainingCapacity: venueMapping.maxTeams ? venueMapping.maxTeams - assignedTeams : null,
      }
    }),

  // Protected procedures (Admin only for venue management)
  create: adminProcedure
    .input(createVenueSchema)
    .mutation(async ({ input }) => {
      try {
        const venue = await db.venue.create({
          data: input,
        })

        return venue
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create venue',
        })
      }
    }),

  update: adminProcedure
    .input(updateVenueSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const venue = await db.venue.update({
          where: { id },
          data: updateData,
        })

        return venue
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        })
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        // Check if venue has any active mappings
        const activeMappings = await db.venue_location_mappings.count({
          where: {
            venue_id: input.id,
            isActive: true,
          },
        })

        if (activeMappings > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete venue with active location mappings',
          })
        }

        await db.venue.delete({
          where: { id: input.id },
        })

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        })
      }
    }),

  // Venue location mapping management
  createLocationMapping: adminProcedure
    .input(createVenueLocationMappingSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if mapping already exists
        const existing = await db.venue_location_mappings.findFirst({
          where: {
            event_id: input.eventId,
            venue_id: input.venueId,
            tournamentLevel: input.tournamentLevel,
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Venue is already mapped to this event and tournament level',
          })
        }

        const mapping = await db.venue_location_mappings.create({
          data: input,
          include: {
            venue: true,
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return mapping
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create venue location mapping',
        })
      }
    }),

  updateLocationMapping: adminProcedure
    .input(updateVenueLocationMappingSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const mapping = await db.venue_location_mappings.update({
          where: { id },
          data: updateData,
        })

        return mapping
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue location mapping not found',
        })
      }
    }),

  deleteLocationMapping: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        // Check if any teams are assigned to this venue mapping
        const assignedTeams = await db.team_venue_assignments.count({
          where: {
            OR: [
              { clusterVenueMappingId: input.id },
              { divisionVenueMappingId: input.id },
              { finalVenueMappingId: input.id },
            ],
          },
        })

        if (assignedTeams > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete venue mapping with assigned teams',
          })
        }

        await db.venue_location_mappings.delete({
          where: { id: input.id },
        })

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue location mapping not found',
        })
      }
    }),

  // Taluk cluster mapping management
  createTalukClusterMapping: adminProcedure
    .input(createTalukClusterMappingSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if mapping already exists
        const existing = await db.taluk_cluster_mappings.findFirst({
          where: {
            event_id: input.eventId,
            district: input.district,
            taluk: input.taluk,
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Taluk is already mapped to a cluster venue for this event',
          })
        }

        const mapping = await db.taluk_cluster_mappings.create({
          data: input,
          include: {
            clusterVenueMapping: {
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
          },
        })

        return mapping
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create taluk cluster mapping',
        })
      }
    }),

  // Cluster division mapping management
  createClusterDivisionMapping: adminProcedure
    .input(createClusterDivisionMappingSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if mapping already exists
        const existing = await db.cluster_division_mappings.findFirst({
          where: {
            event_id: input.eventId,
            clusterVenueMappingId: input.clusterVenueMappingId,
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Cluster venue is already mapped to a division venue',
          })
        }

        const mapping = await db.cluster_division_mappings.create({
          data: input,
          include: {
            clusterVenueMapping: {
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
            divisionVenueMapping: {
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
          },
        })

        return mapping
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create cluster division mapping',
        })
      }
    }),

  // Bulk operations for venue mappings
  bulkCreateTalukMappings: adminProcedure
    .input(z.object({
      event_id: z.string().uuid(),
      clusterVenueMappingId: z.string().uuid(),
      taluks: z.array(z.object({
        district: z.string(),
        state: z.string(),
        taluk: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      try {
        const mappings = await Promise.all(
          input.taluks.map((taluk) =>
            db.taluk_cluster_mappings.create({
              data: {
                event_id: input.eventId,
                clusterVenueMappingId: input.clusterVenueMappingId,
                ...taluk,
              },
            })
          )
        )

        return mappings
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create taluk mappings',
        })
      }
    }),
})