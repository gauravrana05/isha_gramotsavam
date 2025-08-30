import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminEventsRouter = createTRPCRouter({
  // Get Sports
  getSports: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
      includeTeamCounts: z.boolean().default(false),
      includeGenderCategories: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const includeClause: any = {};
      
      if (input.includeTeamCounts) {
        includeClause._count = {
          select: {
            teams: true,
          },
        };
      }

      if (input.includeGenderCategories) {
        includeClause.sportGenderCategories = {
          select: {
            genderCategory: true,
          },
        };
      }

      const whereClause: any = {
        deletedAt: null, // Exclude soft deleted sports
      };

      if (!input.includeInactive) {
        whereClause.isActive = true;
      }

      const sports = await db.sport.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: { name: 'asc' },
      });

      // Transform the data to include gender categories in a more usable format
      const transformedSports = sports.map((sport: any) => {
        const result: any = { ...sport };
        
        if (input.includeGenderCategories && sport.sportGenderCategories) {
          result.genderCategories = sport.sportGenderCategories.map((gc: any) => gc.genderCategory);
          delete result.sportGenderCategories;
        }
        
        return result;
      });

      return transformedSports;
    }),

  // Create Sport
  createSport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.enum(['individual', 'team']),
      description: z.string().optional(),
      maxPlayers: z.number().optional(),
      minPlayers: z.number().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const sport = await db.sport.create({
        data: input,
      });

      return sport;
    }),

  // Update Sport
  updateSport: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      category: z.enum(['individual', 'team']).optional(),
      description: z.string().optional(),
      maxPlayers: z.number().optional(),
      minPlayers: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...updateData } = input;
      const sport = await db.sport.update({
        where: { id },
        data: updateData,
      });

      return sport;
    }),

  // Delete Sport
  deleteSport: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.sport.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get Sport By ID
  getSportById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const sport = await db.sport.findUnique({
        where: { id: input.id },
        include: {
          teams: {
            include: {
              captain: true,
              venue: true,
            },
          },
          _count: {
            select: {
              teams: true,
            },
          },
        },
      });

      if (!sport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sport not found' });
      }

      return sport;
    }),

  // Get Events
  getEvents: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'upcoming', 'ongoing', 'completed']).default('all'),
      sportId: z.string().optional(),
      venueId: z.string().optional(),
      searchQuery: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.sportId) {
        where.sportId = input.sportId;
      }
      
      if (input.venueId) {
        where.venueId = input.venueId;
      }
      
      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { description: { contains: input.searchQuery, mode: 'insensitive' } },
        ];
      }

      const now = new Date();
      if (input.status === 'upcoming') {
        where.startDate = { gt: now };
      } else if (input.status === 'ongoing') {
        where.AND = [
          { startDate: { lte: now } },
          { endDate: { gte: now } },
        ];
      } else if (input.status === 'completed') {
        where.endDate = { lt: now };
      }

      const [events, totalCount] = await Promise.all([
        db.event.findMany({
          where,
          include: {
            createdByUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                fixtures: true,
                teams: true,
              },
            },
          },
          orderBy: { startDate: 'asc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.event.count({ where }),
      ]);

      return {
        events,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Create Event
  createEvent: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sportId: z.string(),
      venueId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      maxTeams: z.number().optional(),
      registrationDeadline: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const event = await db.event.create({
        data: input,
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return event;
    }),

  // Update Event
  updateEvent: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      sportId: z.string().optional(),
      venueId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      maxTeams: z.number().optional(),
      registrationDeadline: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...updateData } = input;
      const event = await db.event.update({
        where: { id },
        data: updateData,
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return event;
    }),

  // Delete Event
  deleteEvent: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.event.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get Event By ID
  getEventById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const event = await db.event.findUnique({
        where: { id: input.id },
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          fixtures: {
            include: {
              team1: true,
              team2: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      return event;
    }),

  // Get Fixtures
  getFixtures: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      venueId: z.string().optional(),
      status: z.enum(['all', 'scheduled', 'ongoing', 'completed']).default('all'),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.eventId) {
        where.eventId = input.eventId;
      }
      
      if (input.venueId) {
        where.event = { venueId: input.venueId };
      }
      
      if (input.status !== 'all') {
        where.status = input.status;
      }

      const [fixtures, totalCount] = await Promise.all([
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
            team1: true,
            team2: true,
          },
          orderBy: { scheduledAt: 'asc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.fixture.count({ where }),
      ]);

      return {
        fixtures,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),
});
