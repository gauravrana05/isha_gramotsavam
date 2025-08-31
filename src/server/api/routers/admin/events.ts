import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { calculateEventStatus, validateEventDates } from '@/lib/eventStatus';

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
        data: {
          name: input.name,
          isActive: input.isActive,
          description: input.description,
          mainPlayersCount: input.maxPlayers || 11,
          maxSubstitutes: input.minPlayers || 5,
        },
      });

      return sport;
    }),

  // Update Sport
  updateSport: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      mainPlayersCount: z.number().optional(),
      maxSubstitutes: z.number().optional(),
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
            select: {
              id: true,
              name: true,
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

      if (input.status === 'upcoming') {
        where.status = 'draft';
      } else if (input.status === 'ongoing') {
        where.status = { in: ['registration_open', 'registration_closed', 'active'] };
      } else if (input.status === 'completed') {
        where.status = { in: ['completed', 'cancelled'] };
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
      registrationStartDate: z.string(),
      registrationEndDate: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Convert string dates to Date objects
      const registrationStartDate = new Date(input.registrationStartDate + 'T00:00:00.000Z');
      const registrationEndDate = new Date(input.registrationEndDate + 'T00:00:00.000Z');
      const startDate = new Date(input.startDate + 'T00:00:00.000Z');
      const endDate = new Date(input.endDate + 'T00:00:00.000Z');

      // Validate date logic
      const validationError = validateEventDates(registrationStartDate, registrationEndDate, startDate, endDate);
      if (validationError) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: validationError });
      }

      // Calculate status based on dates
      const status = calculateEventStatus(registrationStartDate, registrationEndDate, startDate, endDate);

      const event = await db.event.create({
        data: {
          name: input.name,
          description: input.description,
          registrationStartDate,
          registrationEndDate,
          startDate,
          endDate,
          status,
          createdBy: ctx.user.id,
        },
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
      registrationStartDate: z.string().optional(),
      registrationEndDate: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(['draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...inputData } = input;
      
      // Get current event data
      const currentEvent = await db.event.findUnique({ where: { id } });
      if (!currentEvent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Convert string dates to Date objects and merge with current data
      const updateData: any = {};
      Object.entries(inputData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key.includes('Date') && typeof value === 'string') {
            updateData[key] = new Date(value + 'T00:00:00.000Z');
          } else {
            updateData[key] = value;
          }
        }
      });

      // Get final date values (updated or current)
      const registrationStartDate = updateData.registrationStartDate || currentEvent.registrationStartDate;
      const registrationEndDate = updateData.registrationEndDate || currentEvent.registrationEndDate;
      const startDate = updateData.startDate || currentEvent.startDate;
      const endDate = updateData.endDate || currentEvent.endDate;

      // Validate date logic if any dates are being updated
      if (updateData.registrationStartDate || updateData.registrationEndDate || updateData.startDate || updateData.endDate) {
        const validationError = validateEventDates(registrationStartDate, registrationEndDate, startDate, endDate);
        if (validationError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: validationError });
        }
      }

      // Calculate status based on dates (unless manually setting to cancelled or already cancelled)
      if (inputData.status !== 'cancelled' && currentEvent.status !== 'cancelled') {
        updateData.status = calculateEventStatus(registrationStartDate, registrationEndDate, startDate, endDate);
      }

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

  // Refresh Event Statuses
  refreshEventStatuses: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Get all non-cancelled events
      const events = await db.event.findMany({
        where: {
          status: { not: 'cancelled' }
        }
      });

      // Update each event's status
      const updatePromises = events.map(event => {
        const newStatus = calculateEventStatus(
          event.registrationStartDate,
          event.registrationEndDate,
          event.startDate,
          event.endDate
        );

        return db.event.update({
          where: { id: event.id },
          data: { status: newStatus }
        });
      });

      await Promise.all(updatePromises);

      return { updated: events.length };
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
            select: {
              id: true,
              status: true,
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
          },
          orderBy: { createdAt: 'asc' },
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
