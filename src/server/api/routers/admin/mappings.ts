import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminMappingsRouter = createTRPCRouter({
  // Get Taluk Cluster Mappings
  getTalukClusterMappings: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      district: z.string().optional(),
      state: z.string().optional(),
      taluk: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        eventId: input.eventId,
      };
      
      if (input.district) {
        where.district = { contains: input.district, mode: 'insensitive' };
      }
      
      if (input.state) {
        where.state = { contains: input.state, mode: 'insensitive' };
      }
      
      if (input.taluk) {
        where.taluk = { contains: input.taluk, mode: 'insensitive' };
      }

      const mappings = await db.talukClusterMapping.findMany({
        where,
        include: {
          venueLocationMapping: {
            include: {
              venue: true,
            },
          },
          event: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { state: 'asc' },
          { district: 'asc' },
          { taluk: 'asc' },
        ],
      });

      return mappings;
    }),

  // Get pending taluk mappings (taluks that need mapping)
  getPendingTalukMappings: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      level: z.enum(['cluster', 'division', 'final']).default('cluster'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Get all venue level mappings for this event and level grouped by district
      const venueLevelMappings = await db.venueLevelMapping.findMany({
        where: {
          eventId: input.eventId,
          level: input.level,
          isActive: true,
        },
        include: {
          venue: true,
        },
        orderBy: [
          { venue: { state: 'asc' } },
          { venue: { district: 'asc' } },
          { venue: { name: 'asc' } },
        ],
      });

      // Group venues by district
      const venuesByDistrict = venueLevelMappings.reduce((acc, venueMapping) => {
        const key = `${venueMapping.venue.state}-${venueMapping.venue.district}`;
        if (!acc[key]) {
          acc[key] = {
            state: venueMapping.venue.state,
            district: venueMapping.venue.district,
            venues: [],
          };
        }
        acc[key].venues.push(venueMapping);
        return acc;
      }, {} as Record<string, { state: string; district: string; venues: any[] }>);

      // Get existing mappings for this level
      const existingMappings = await db.talukClusterMapping.findMany({
        where: {
          eventId: input.eventId,
          venueLocationMapping: {
            level: input.level,
          },
        },
        select: {
          state: true,
          district: true,
          taluk: true,
        },
      });

      const mappedTaluks = new Set(
        existingMappings.map(m => `${m.state}-${m.district}-${m.taluk}`)
      );

      // For districts with multiple venue level mappings, get all taluks and find unmapped ones
      const pendingTaluks = [];
      
      for (const [key, districtData] of Object.entries(venuesByDistrict)) {
        if (districtData.venues.length > 1) {
          // Get all taluks for this district
          try {
            const { taluks } = await import('@/lib/services/pincodeService').then(m => 
              m.pincodeService.getTaluksByDistrict(districtData.state, districtData.district)
            );
            
            // Find unmapped taluks
            for (const taluk of taluks) {
              const talukKey = `${districtData.state}-${districtData.district}-${taluk}`;
              if (!mappedTaluks.has(talukKey)) {
                pendingTaluks.push({
                  state: districtData.state,
                  district: districtData.district,
                  taluk,
                  level: input.level,
                  availableVenues: districtData.venues.map(v => ({
                    id: v.id,
                    venue: v.venue,
                    level: v.level,
                    maxTeams: v.maxTeams,
                  })),
                });
              }
            }
          } catch (error) {
            console.error(`Failed to get taluks for ${districtData.district}, ${districtData.state}:`, error);
          }
        }
      }

      return pendingTaluks;
    }),

  // Create Taluk Cluster Mapping
  createTalukClusterMapping: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      district: z.string(),
      state: z.string(),
      taluk: z.string(),
      clusterVenueMappingId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping already exists
      const existingMapping = await db.talukClusterMapping.findFirst({
        where: {
          eventId: input.eventId,
          district: input.district,
          state: input.state,
          taluk: input.taluk,
        },
      });

      if (existingMapping) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Mapping already exists for this taluk' 
        });
      }

      // Verify venue mapping exists
      const venueMapping = await db.venueLevelMapping.findUnique({
        where: { id: input.clusterVenueMappingId },
        include: { venue: true },
      });

      if (!venueMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Venue mapping not found' 
        });
      }

      const mapping = await db.talukClusterMapping.create({
        data: input,
        include: {
          venueLocationMapping: {
            include: {
              venue: true,
            },
          },
        },
      });

      return mapping;
    }),

  // Update Taluk Cluster Mapping
  updateTalukClusterMapping: protectedProcedure
    .input(z.object({
      id: z.string(),
      clusterVenueMappingId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Verify venue mapping exists
      const venueMapping = await db.venueLevelMapping.findUnique({
        where: { id: input.clusterVenueMappingId },
      });

      if (!venueMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Venue mapping not found' 
        });
      }

      const mapping = await db.talukClusterMapping.update({
        where: { id: input.id },
        data: {
          clusterVenueMappingId: input.clusterVenueMappingId,
        },
        include: {
          venueLocationMapping: {
            include: {
              venue: true,
            },
          },
        },
      });

      return mapping;
    }),

  // Delete Taluk Cluster Mappings
  deleteTalukClusterMappings: protectedProcedure
    .input(z.object({
      mappingIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.talukClusterMapping.deleteMany({
        where: {
          id: { in: input.mappingIds },
        },
      });

      return { success: true };
    }),

  // Bulk Create Taluk Mappings
  bulkCreateTalukMappings: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      mappings: z.array(z.object({
        district: z.string(),
        state: z.string(),
        taluk: z.string(),
        clusterVenueMappingId: z.string(),
      })),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const mapping of input.mappings) {
        try {
          // Check if mapping already exists if skipDuplicates is true
          if (input.skipDuplicates) {
            const existingMapping = await db.talukClusterMapping.findFirst({
              where: {
                eventId: input.eventId,
                district: mapping.district,
                state: mapping.state,
                taluk: mapping.taluk,
              },
            });

            if (existingMapping) {
              results.skipped++;
              continue;
            }
          }

          await db.talukClusterMapping.create({
            data: {
              eventId: input.eventId,
              ...mapping,
            },
          });
          results.created++;
        } catch (error) {
          results.errors.push(`Failed to create mapping for ${mapping.taluk}: ${error}`);
        }
      }

      return results;
    }),
});
