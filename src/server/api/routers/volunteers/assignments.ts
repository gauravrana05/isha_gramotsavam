import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const volunteersAssignmentsRouter = createTRPCRouter({
  // Get volunteer assignments for dashboard
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    // Debug logging
    console.log('🔍 getMyAssignments Debug:', {
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      timestamp: new Date().toISOString()
    });

    // Check if user has volunteer role
    if (!ctx.user || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
      console.log('❌ Role check failed:', {
        userRole: ctx.user?.role,
        allowedRoles: ['general_volunteer', 'technical_volunteer', 'verification_volunteer']
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access volunteer functionality',
      });
    }

    // First, let's check if any assignments exist for this user (including deleted ones)
    const allAssignments = await db.volunteerAssignment.findMany({
      where: { volunteerId: ctx.user.id },
      select: {
        id: true,
        volunteerId: true,
        deletedAt: true,
        status: true,
      }
    });

    console.log('🔍 All assignments for user:', {
      userId: ctx.user.id,
      totalAssignments: allAssignments.length,
      assignments: allAssignments
    });

    const assignments = await db.volunteerAssignment.findMany({
      where: { 
        volunteerId: ctx.user.id,
        deletedAt: null  // Explicitly exclude soft-deleted records
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        venueLevelMapping: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                district: true,
                state: true,
                panchayat: true,
                taluk: true,
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

    // Additional debug logging to see what's happening with the joins
    console.log('🔍 Detailed assignments result:', {
      userId: ctx.user.id,
      assignmentsCount: assignments.length,
      assignments: assignments.map(a => ({
        id: a.id,
        status: a.status,
        eventId: a.eventId,
        eventName: a.event?.name || 'NO_EVENT',
        venueLevelMappingId: a.venueLevelMappingId,
        venueName: a.venueLevelMapping?.venue?.name || 'NO_VENUE',
        hasVenueLevelMapping: !!a.venueLevelMapping,
        hasEvent: !!a.event,
        createdAt: a.createdAt
      }))
    });

    console.log('✅ Final assignments result:', {
      userId: ctx.user.id,
      assignmentsCount: assignments.length,
      assignments: assignments.map(a => ({
        id: a.id,
        eventName: a.event?.name,
        venueName: a.venueLevelMapping?.venue?.name,
        status: a.status
      }))
    });

    return assignments;
  }),
});
