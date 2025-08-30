import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const volunteersAssignmentsRouter = createTRPCRouter({
  // Get volunteer assignments for dashboard
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    // Check if user has volunteer role
    if (!ctx.user || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access volunteer functionality',
      });
    }

    const assignments = await db.volunteerAssignment.findMany({
      where: { volunteerId: ctx.user.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        venueLocationMapping: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                district: true,
                state: true,
                panchayat: true,
                taluk: true,
                facilities: true,
              },
            },
          },
        },
        volunteerUser: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments;
  }),
});
