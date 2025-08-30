import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { assignVenueToTeam } from "@/lib/services/venueAssignment";

export const adminVenuesRouter = createTRPCRouter({
  // Enhanced getVenues with filtering and pagination
  getVenues: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'active', 'inactive']).default('all'),
      district: z.string().optional(),
      searchQuery: z.string().optional(),
      sortBy: z.enum(['name', 'district', 'createdAt', 'capacity']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        deletedAt: null, // Only non-deleted venues
      };
      
      if (input.status === 'active') {
        where.isActive = true;
      } else if (input.status === 'inactive') {
        where.isActive = false;
      }
      
      if (input.district) {
        where.district = { contains: input.district, mode: 'insensitive' };
      }
      
      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { district: { contains: input.searchQuery, mode: 'insensitive' } },
          { taluk: { contains: input.searchQuery, mode: 'insensitive' } },
          { panchayat: { contains: input.searchQuery, mode: 'insensitive' } },
        ];
      }

      const [venues, totalCount] = await Promise.all([
        db.venue.findMany({
          where,
          include: {
            venueLocationMappings: true,
          },
          orderBy: { [input.sortBy]: input.sortOrder },
          skip: input.offset,
          take: input.limit,
        }),
        db.venue.count({ where }),
      ]);

      // Add counts as 0 for now (can be calculated later if needed)
      const venuesWithCounts = venues.map(venue => ({
        ...venue,
        _count: {
          teams: 0,
          events: 0,
        },
      }));

      return {
        venues: venuesWithCounts,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Create Venue
  createVenue: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      capacity: z.number().optional(),
      panchayat: z.string().max(100).optional(),
      taluk: z.string().max(100).optional(),
      district: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      pincode: z.string().max(10).optional(),
      contactPhone: z.string().max(20).optional(),
      contactEmail: z.string().email().optional(),
      contactPerson: z.string().max(100).optional(),
      facilities: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const venue = await db.venue.create({
        data: input,
        include: {
          venueLocationMappings: true,
        },
      });

      return {
        ...venue,
        _count: {
          teams: 0,
          events: 0,
        },
      };
    }),

  // Update Venue
  updateVenue: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      capacity: z.number().optional(),
      panchayat: z.string().max(100).optional(),
      taluk: z.string().max(100).optional(),
      district: z.string().min(1).max(100).optional(),
      state: z.string().min(1).max(100).optional(),
      pincode: z.string().max(10).optional(),
      contactPhone: z.string().max(20).optional(),
      contactEmail: z.string().email().optional(),
      contactPerson: z.string().max(100).optional(),
      facilities: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...updateData } = input;

      const venue = await db.venue.update({
        where: { id },
        data: updateData,
        include: {
          venueLocationMappings: true,
        },
      });

      return {
        ...venue,
        _count: {
          teams: 0,
          events: 0,
        },
      };
    }),

  // Delete Venues (Soft Delete)
  deleteVenues: protectedProcedure
    .input(z.object({
      venueIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check for existing venue mappings
      const venuesWithMappings = await db.venue.findMany({
        where: {
          id: { in: input.venueIds },
          deletedAt: null, // Only check non-deleted venues
          venueLocationMappings: { some: {} },
        },
        select: { id: true, name: true },
      });

      if (venuesWithMappings.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot delete venues with existing assignments: ${venuesWithMappings.map(v => v.name).join(', ')}`,
        });
      }

      // Soft delete venues
      await db.venue.updateMany({
        where: { 
          id: { in: input.venueIds },
          deletedAt: null, // Only delete non-deleted venues
        },
        data: { deletedAt: new Date() },
      });

      return { deleted: input.venueIds.length };
    }),

  // Update Venue Status
  updateVenueStatus: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const venue = await db.venue.update({
        where: { id: input.venueId },
        data: { isActive: input.isActive },
        include: {
          venueLocationMappings: true,
        },
      });

      return {
        ...venue,
        _count: {
          teams: 0,
          events: 0,
        },
      };
    }),

  // Get Venue by ID
  getVenueById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const venue = await db.venue.findUnique({
        where: { id: input.id },
        include: {
          venueLocationMappings: true,
        },
      });

      if (!venue) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });
      }

      return {
        ...venue,
        teams: [],
        events: [],
        _count: {
          teams: 0,
          events: 0,
        },
      };
    }),

  // Get Venues By Level (existing functionality)
  getVenuesByLevel: protectedProcedure
    .input(z.object({
      level: z.enum(['cluster', 'division', 'state']),
      district: z.string().optional(),
      taluk: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        level: input.level,
        isActive: true,
        deletedAt: null,
      };
      
      if (input.district) {
        where.district = input.district;
      }
      
      if (input.taluk) {
        where.taluk = input.taluk;
      }

      const venues = await db.venue.findMany({
        where,
        include: {
          venueLocationMappings: true,
        },
        orderBy: { name: 'asc' },
      });

      return venues.map(venue => ({
        ...venue,
        _count: {
          teams: 0,
        },
      }));
    }),

  // Get Available Venues for Team (existing functionality)
  getAvailableVenuesForTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          captain: true,
          sport: true,
        },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      const venues = await db.venue.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          district: team.captain.district,
        },
        include: {
          venueLocationMappings: true,
        },
        orderBy: [
          { name: 'asc' },
        ],
      });

      return venues.map(venue => ({
        ...venue,
        _count: {
          teams: 0,
        },
      }));
    }),

  // Auto Assign Team Venue (existing functionality)
  autoAssignTeamVenue: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const result = await assignVenueToTeam(input.teamId);
      return result;
    }),

  // Venue Location Mappings (existing functionality)
  getVenueLocationMappings: protectedProcedure
    .input(z.object({
      level: z.enum(['all', 'cluster', 'division', 'state']).default('all'),
      district: z.string().optional(),
      taluk: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.level !== 'all') {
        where.venue = { level: input.level };
      }
      
      if (input.district) {
        where.venue = { 
          ...where.venue,
          district: { contains: input.district, mode: 'insensitive' }
        };
      }
      
      if (input.taluk) {
        where.venue = { 
          ...where.venue,
          taluk: { contains: input.taluk, mode: 'insensitive' }
        };
      }

      const mappings = await db.venueLocationMapping.findMany({
        where,
        include: {
          venue: true,
        },
        orderBy: [
          { venue: { level: 'asc' } },
          { venue: { district: 'asc' } },
          { venue: { name: 'asc' } },
        ],
      });

      return mappings;
    }),

  createVenueLocationMapping: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      district: z.string(),
      taluk: z.string(),
      cluster: z.string().optional(),
      division: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const mapping = await db.venueLocationMapping.create({
        data: input,
        include: {
          venue: true,
        },
      });

      return mapping;
    }),

  updateVenueLocationMapping: protectedProcedure
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
      const mapping = await db.venueLocationMapping.update({
        where: { id },
        data: updateData,
        include: {
          venue: true,
        },
      });

      return mapping;
    }),

  deleteVenueLocationMapping: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.venueLocationMapping.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
