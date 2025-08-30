import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminMappingsRouter = createTRPCRouter({
  // Get Taluk Cluster Mappings
  getTalukClusterMappings: protectedProcedure
    .input(z.object({
      district: z.string().optional(),
      taluk: z.string().optional(),
      cluster: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.district) {
        where.district = { contains: input.district, mode: 'insensitive' };
      }
      
      if (input.taluk) {
        where.taluk = { contains: input.taluk, mode: 'insensitive' };
      }
      
      if (input.cluster) {
        where.cluster = { contains: input.cluster, mode: 'insensitive' };
      }

      const mappings = await db.talukClusterMapping.findMany({
        where,
        orderBy: [
          { district: 'asc' },
          { taluk: 'asc' },
          { cluster: 'asc' },
        ],
      });

      return mappings;
    }),

  // Create Taluk Cluster Mapping
  createTalukClusterMapping: protectedProcedure
    .input(z.object({
      district: z.string(),
      taluk: z.string(),
      cluster: z.string(),
      division: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping already exists
      const existingMapping = await db.talukClusterMapping.findFirst({
        where: {
          district: input.district,
          taluk: input.taluk,
          cluster: input.cluster,
        },
      });

      if (existingMapping) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Mapping already exists for this district-taluk-cluster combination' 
        });
      }

      const mapping = await db.talukClusterMapping.create({
        data: input,
      });

      return mapping;
    }),

  // Update Taluk Cluster Mapping
  updateTalukClusterMapping: protectedProcedure
    .input(z.object({
      id: z.string(),
      district: z.string().optional(),
      taluk: z.string().optional(),
      cluster: z.string().optional(),
      division: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...updateData } = input;
      const mapping = await db.talukClusterMapping.update({
        where: { id },
        data: updateData,
      });

      return mapping;
    }),

  // Delete Taluk Cluster Mapping
  deleteTalukClusterMapping: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.talukClusterMapping.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Bulk Create Taluk Mappings
  bulkCreateTalukMappings: protectedProcedure
    .input(z.object({
      mappings: z.array(z.object({
        district: z.string(),
        taluk: z.string(),
        cluster: z.string(),
        division: z.string().optional(),
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
                district: mapping.district,
                taluk: mapping.taluk,
                cluster: mapping.cluster,
              },
            });

            if (existingMapping) {
              results.skipped++;
              continue;
            }
          }

          await db.talukClusterMapping.create({
            data: mapping,
          });
          results.created++;
        } catch (error) {
          results.errors.push(`Failed to create mapping for ${mapping.district}-${mapping.taluk}-${mapping.cluster}: ${error}`);
        }
      }

      return results;
    }),
});
