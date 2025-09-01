import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminMappingsRouter = createTRPCRouter({
  // Get Location Cluster Mappings
  getLocationClusterMappings: adminProcedure
    .input(z.object({
      eventId: z.string(),
      locationType: z.enum(['district', 'taluk']).optional(),
      state: z.string().optional(),
      district: z.string().optional(),
      locationName: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const where: any = {
        eventId: input.eventId,
      };
      
      if (input.locationType) {
        where.locationType = input.locationType;
      }
      
      if (input.state) {
        where.state = { contains: input.state, mode: 'insensitive' };
      }
      
      if (input.district) {
        where.district = { contains: input.district, mode: 'insensitive' };
      }
      
      if (input.locationName) {
        where.locationName = { contains: input.locationName, mode: 'insensitive' };
      }

      const mappings = await db.locationClusterMapping.findMany({
        where,
        include: {
          event: {
            select: {
              name: true,
            },
          },
          venueLevelMapping: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  address: true,
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
          { locationName: 'asc' },
        ],
      });

      return mappings;
    }),

  // Create Location Cluster Mapping (Bulk)
  createLocationClusterMapping: adminProcedure
    .input(z.object({
      eventId: z.string(),
      locationType: z.enum(['district', 'taluk']),
      locationNames: z.array(z.string()), // Multiple locations
      state: z.string(),
      district: z.string().optional(), // Required for taluk mappings, null for district mappings
      clusterVenueMappingId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { eventId, locationType, locationNames, state, district, clusterVenueMappingId } = input;

      // Validate district requirement for taluk mappings
      if (locationType === 'taluk' && !district) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'District is required for taluk mappings' });
      }

      // Check for existing mappings
      const existingMappings = await db.locationClusterMapping.findMany({
        where: {
          eventId,
          locationType,
          locationName: { in: locationNames },
          state,
          district: locationType === 'taluk' ? district : null,
        },
      });

      if (existingMappings.length > 0) {
        const existingNames = existingMappings.map(m => m.locationName);
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: `Mappings already exist for: ${existingNames.join(', ')}` 
        });
      }

      // Create mappings
      const mappingData = locationNames.map(locationName => ({
        eventId,
        locationType,
        locationName,
        state,
        district: locationType === 'taluk' ? district : null,
        clusterVenueMappingId,
      }));

      await db.locationClusterMapping.createMany({
        data: mappingData,
      });

      return { 
        success: true, 
        message: `Created ${locationNames.length} ${locationType} mappings successfully` 
      };
    }),

  // Delete Location Cluster Mappings
  deleteLocationClusterMappings: adminProcedure
    .input(z.object({
      mappingIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.locationClusterMapping.deleteMany({
        where: {
          id: { in: input.mappingIds },
        },
      });

      return { success: true, message: 'Mappings deleted successfully' };
    }),

  // Get Cluster Division Mappings (unchanged)
  getClusterDivisionMappings: adminProcedure
    .input(z.object({
      eventId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const mappings = await db.clusterDivisionMapping.findMany({
        where: {
          eventId: input.eventId,
        },
        include: {
          clusterVenueMapping: {
            include: {
              venue: true,
            },
          },
          divisionVenueMapping: {
            include: {
              venue: true,
            },
          },
        },
        orderBy: [
          { clusterVenueMapping: { venue: { district: 'asc' } } },
          { clusterVenueMapping: { venue: { name: 'asc' } } },
        ],
      });

      return mappings;
    }),

  // Create Cluster Division Mapping (unchanged)
  createClusterDivisionMapping: adminProcedure
    .input(z.object({
      eventId: z.string(),
      clusterVenueMappingId: z.string(),
      divisionVenueMappingId: z.string(),
      state: z.string(), // Add state parameter
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if mapping already exists
      const existingMapping = await db.clusterDivisionMapping.findFirst({
        where: {
          eventId: input.eventId,
          clusterVenueMappingId: input.clusterVenueMappingId,
        },
      });

      if (existingMapping) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Cluster venue is already mapped to a division venue' 
        });
      }

      const mapping = await db.clusterDivisionMapping.create({
        data: {
          eventId: input.eventId,
          clusterVenueMappingId: input.clusterVenueMappingId,
          divisionVenueMappingId: input.divisionVenueMappingId,
          state: input.state, // Include state in database create
        },
        include: {
          clusterVenueMapping: {
            include: { venue: true },
          },
          divisionVenueMapping: {
            include: { venue: true },
          },
        },
      });

      return mapping;
    }),

  // Create Bulk Cluster Division Mappings
  createBulkClusterDivisionMappings: adminProcedure
    .input(z.object({
      eventId: z.string(),
      clusterVenueMappingIds: z.array(z.string()),
      divisionVenueMappingId: z.string(),
      state: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { eventId, clusterVenueMappingIds, divisionVenueMappingId, state } = input;

      // Check for existing mappings
      const existingMappings = await db.clusterDivisionMapping.findMany({
        where: {
          eventId,
          clusterVenueMappingId: { in: clusterVenueMappingIds },
        },
        include: {
          clusterVenueMapping: {
            include: { venue: true },
          },
        },
      });

      if (existingMappings.length > 0) {
        const existingClusterNames = existingMappings.map(m => m.clusterVenueMapping.venue.name);
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: `Cluster venues already mapped: ${existingClusterNames.join(', ')}` 
        });
      }

      // Create bulk mappings
      const mappingData = clusterVenueMappingIds.map(clusterVenueMappingId => ({
        eventId,
        clusterVenueMappingId,
        divisionVenueMappingId,
        state,
      }));

      await db.clusterDivisionMapping.createMany({
        data: mappingData,
      });

      // Return created mappings with full details
      const createdMappings = await db.clusterDivisionMapping.findMany({
        where: {
          eventId,
          clusterVenueMappingId: { in: clusterVenueMappingIds },
          divisionVenueMappingId,
        },
        include: {
          clusterVenueMapping: {
            include: { venue: true },
          },
          divisionVenueMapping: {
            include: { venue: true },
          },
        },
      });

      return { 
        success: true, 
        message: `Created ${clusterVenueMappingIds.length} cluster-division mappings successfully`,
        mappings: createdMappings
      };
    }),

  // Delete Cluster Division Mappings (plural - unchanged)
  deleteClusterDivisionMappings: adminProcedure
    .input(z.object({
      mappingIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.clusterDivisionMapping.deleteMany({
        where: {
          id: { in: input.mappingIds },
        },
      });

      return { success: true };
    }),

  // Delete Cluster Division Mapping (singular)
  deleteClusterDivisionMapping: adminProcedure
    .input(z.object({
      mappingIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.clusterDivisionMapping.deleteMany({
        where: {
          id: { in: input.mappingIds },
        },
      });

      return { success: true };
    }),

  // Update Cluster Division Mapping
  updateClusterDivisionMapping: adminProcedure
    .input(z.object({
      eventId: z.string(),
      divisionVenueMappingId: z.string(),
      clusterVenueMappingIds: z.array(z.string()),
      state: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // First, delete existing mappings for this division venue
      await db.clusterDivisionMapping.deleteMany({
        where: {
          eventId: input.eventId,
          divisionVenueMappingId: input.divisionVenueMappingId,
        },
      });

      // Then create new mappings
      const mappings = await Promise.all(
        input.clusterVenueMappingIds.map(clusterVenueMappingId =>
          db.clusterDivisionMapping.create({
            data: {
              eventId: input.eventId,
              divisionVenueMappingId: input.divisionVenueMappingId,
              clusterVenueMappingId: clusterVenueMappingId,
              state: input.state,
            },
            include: {
              clusterVenueMapping: {
                include: { venue: true },
              },
              divisionVenueMapping: {
                include: { venue: true },
              },
            },
          })
        )
      );

      return mappings;
    }),

  // Add missing methods
  getTalukClusterMappings: adminProcedure
    .input(z.object({
      eventId: z.string(),
      state: z.string().optional(),
      district: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return await db.locationClusterMapping.findMany({
        where: {
          eventId: input.eventId,
          locationType: 'taluk',
          ...(input.state && { state: input.state }),
          ...(input.district && { district: input.district }),
        },
        include: {
          venueLevelMapping: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  district: true,
                  state: true,
                }
              }
            }
          }
        },
        orderBy: [
          { state: 'asc' },
          { district: 'asc' },
          { locationName: 'asc' }
        ]
      });
    }),

  deleteLocationClusterMapping: adminProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.locationClusterMapping.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Mapping deleted successfully' };
    }),

  deleteTalukClusterMapping: adminProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.locationClusterMapping.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Taluk mapping deleted successfully' };
    }),
});
