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
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          venueLocationMappings: includeVenueMappings ? {
            include: {
              venue: true,
            },
          } : false,
          fixtures: includeFixtures ? {
            include: {
              team1: {
                select: {
                  id: true,
                  teamName: true,
                  captainUser: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              team2: {
                select: {
                  id: true,
                  teamName: true,
                  captainUser: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
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
      const { limit, offset, status, sportId, venueId, includeStats } = input

      const where: any = {}
      
      if (status) {
        where.status = status
      }
      
      if (sportId) {
        where.sportId = sportId
      }
      
      if (venueId) {
        where.venueId = venueId
      }

      const events = await db.event.findMany({
        where,
        include: {
          sport: true,
          venue: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: includeStats ? {
            select: {
              fixtures: true,
              teams: true,
            },
          } : false,
        },
        orderBy: { startDate: 'desc' },
        skip: offset,
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
          createdById: ctx.user.id,
        },
        include: {
          sport: true,
          venue: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
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
        include: {
          sport: true,
          venue: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      return event
    }),

  // Delete event
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.event.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
});
