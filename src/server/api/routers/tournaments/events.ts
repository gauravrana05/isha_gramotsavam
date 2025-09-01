import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../../trpc'
import {
  createEventSchema,
  updateEventSchema,
  getEventByIdSchema,
  getEventsSchema,
} from '@/lib/validations/tournament'

export const tournamentsEventsRouter = createTRPCRouter({
  // Get event by ID
  getById: publicProcedure
    .input(getEventByIdSchema)
    .query(async ({ input }) => {
      const { id, includeVenueMappings, includeFixtures } = input

      const event = await db.event.findUnique({
        where: { id },
        include: {
          venueLevelMappings: includeVenueMappings ? {
            include: {
              venue: true,
            },
          } : false,
          fixtures: includeFixtures ? {
            include: {
              fixtureTeams: {
                include: {
                  team: true,
                },
              },
            },
          } : false,
        },
      })

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      return event
    }),

  // Get all events
  getAll: publicProcedure
    .input(getEventsSchema)
    .query(async ({ input }) => {
      const { page, limit, status, createdBy, search, dateRange, sortBy, sortOrder } = input

      const where: any = {}
      
      if (status) {
        where.status = status
      }
      
      if (createdBy) {
        where.createdBy = createdBy
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }
      
      if (dateRange) {
        where.startDate = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        }
      }

      const skip = (page - 1) * limit

      const events = await db.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      })

      return events
    }),

  // Create event
  create: adminProcedure
    .input(createEventSchema)
    .mutation(async ({ input, ctx }) => {
      const event = await db.event.create({
        data: {
          ...input,
          createdBy: ctx.user.id,
        },
      })

      return event
    }),

  // Update event
  update: adminProcedure
    .input(updateEventSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const event = await db.event.update({
        where: { id },
        data: updateData,
      })

      return event
    }),

  // Delete event
  delete: adminProcedure
    .input(z.object({ id: z.string() }).optional().default({}))
    .mutation(async ({ input }) => {
      await db.event.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
});
