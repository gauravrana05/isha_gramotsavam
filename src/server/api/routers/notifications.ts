import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import type { UserRole, NotificationType, NotificationCategory, NotificationBroadcastStatus } from '@prisma/client'

// Input schemas
const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error', 'team_invitation', 'verification_update', 'match_result', 'venue_assignment', 'system_announcement', 'match_reminder', 'tournament_update']),
  recipientIds: z.array(z.string().uuid()),
  actionUrl: z.string().url().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().uuid().optional(),
  scheduledFor: z.date().optional(),
})

const createBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error', 'team_invitation', 'verification_update', 'match_result', 'venue_assignment', 'system_announcement', 'match_reminder', 'tournament_update']),
  targetRoles: z.array(z.enum(['admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer', 'public'])),
  targetVenueIds: z.array(z.string().uuid()).optional(),
  scheduledFor: z.date().optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error', 'team_invitation', 'verification_update', 'match_result', 'venue_assignment', 'system_announcement', 'match_reminder', 'tournament_update']),
  category: z.enum(['general', 'match', 'team', 'verification', 'system', 'emergency']).default('general'),
  variables: z.record(z.string()).default({}),
})

// Helper function to check notification permissions
function canCreateNotification(userRole: string, targetRoles: UserRole[]): boolean {
  switch (userRole) {
    case 'admin':
      return true; // Admin can notify anyone
    case 'verification_volunteer':
      return targetRoles.every(role => ['captain', 'player'].includes(role));
    case 'technical_volunteer':
      return targetRoles.every(role => ['captain', 'player'].includes(role));
    default:
      return false;
  }
}

// Helper function to get users by venue assignment for volunteers
async function getUsersByVenueAssignment(db: any, userId: string, targetRoles: UserRole[], targetVenueIds?: string[]) {
  // Get volunteer's assigned venues
  const volunteerAssignments = await db.volunteerAssignment.findMany({
    where: {
      volunteerId: userId,
      deletedAt: null,
    },
    select: {
      venueLevelMappingId: true,
    },
  });

  const assignedVenueIds = volunteerAssignments.map(assignment => assignment.venueLevelMappingId);
  const venueIdsToCheck = targetVenueIds ? targetVenueIds.filter(id => assignedVenueIds.includes(id)) : assignedVenueIds;

  if (venueIdsToCheck.length === 0) {
    return [];
  }

  // Get teams assigned to these venues
  const teamVenueAssignments = await db.teamVenueAssignment.findMany({
    where: {
      OR: [
        { clusterVenueMappingId: { in: venueIdsToCheck } },
        { divisionVenueMappingId: { in: venueIdsToCheck } },
        { finalVenueMappingId: { in: venueIdsToCheck } },
      ],
      deletedAt: null,
    },
    select: {
      teamId: true,
    },
  });

  const teamIds = teamVenueAssignments.map(assignment => assignment.teamId);

  if (teamIds.length === 0) {
    return [];
  }

  // Get users from these teams based on target roles
  const whereConditions: any[] = [];

  if (targetRoles.includes('captain')) {
    whereConditions.push({
      teamsAsCaptain: {
        some: {
          id: { in: teamIds },
        },
      },
    });
  }

  if (targetRoles.includes('player')) {
    whereConditions.push({
      teamPlayers: {
        some: {
          teamId: { in: teamIds },
        },
      },
    });
  }

  if (whereConditions.length === 0) {
    return [];
  }

  return await db.user.findMany({
    where: {
      OR: whereConditions,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });
}

export const notificationsRouter = createTRPCRouter({
  // Get all notifications for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.notification.findMany({
        where: {
          userId: ctx.user.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
    }),

  // Get user notifications (alias for getAll for compatibility)
  getUserNotifications: protectedProcedure
    .input(z.object({
      userId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false)
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // Use current user's ID if not provided or if not admin
      const targetUserId = (ctx.user.role === 'admin' && input.userId) ? input.userId : ctx.user.id;

      const notifications = await ctx.db.notification.findMany({
        where: {
          userId: targetUserId,
          deletedAt: null,
          ...(input.unreadOnly ? { read: false } : {})
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
        skip: input.offset,
      });

      const unreadCount = await ctx.db.notification.count({
        where: {
          userId: targetUserId,
          read: false,
          deletedAt: null,
        },
      });

      return {
        notifications,
        unreadCount,
        hasMore: notifications.length === input.limit
      };
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.user.id,
          deletedAt: null,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return await ctx.db.notification.update({
        where: { id: input.notificationId },
        data: { 
          read: true,
          readAt: new Date()
        },
      });
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.db.notification.updateMany({
        where: {
          userId: ctx.user.id,
          read: false,
          deletedAt: null,
        },
        data: { 
          read: true,
          readAt: new Date()
        },
      });

      return {
        success: true,
        updatedCount: result.count
      };
    }),

  // Get notifications by venue for volunteers
  getByVenue: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.notification.findMany({
        where: {
          userId: ctx.user.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: ctx.user.id,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }),

  // Get notifications for the current user (legacy)
  getMyNotifications: protectedProcedure
    .query(async ({ ctx }) => {
      const notifications = await ctx.db.notification.findMany({
        where: {
          userId: ctx.user.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      return {
        notifications,
        total: notifications.length,
        hasMore: false,
      };
    }),

  // Get notification count for the current user
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.notification.count({
        where: {
          userId: ctx.user.id,
          read: false,
        },
      });
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.user.id,
          deletedAt: null,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return await ctx.db.notification.update({
        where: { id: input.notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await ctx.db.notification.updateMany({
        where: {
          userId: ctx.user.id,
          read: false,
          deletedAt: null,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }),

  // Create individual notification (admin/volunteers only)
  createNotification: protectedProcedure
    .input(createNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create notifications',
        });
      }

      // Validate recipients exist and get their roles
      const recipients = await ctx.db.user.findMany({
        where: {
          id: { in: input.recipientIds },
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (recipients.length !== input.recipientIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Some recipients were not found',
        });
      }

      // Check if user can notify these recipient roles
      const targetRoles = recipients.map(r => r.role) as UserRole[];
      if (!canCreateNotification(ctx.user.role, targetRoles)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot send notifications to these user types',
        });
      }

      // For volunteers, verify they can notify users in their assigned venues
      if (['verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        const allowedUsers = await getUsersByVenueAssignment(ctx.db, ctx.user.id, targetRoles);
        const allowedUserIds = allowedUsers.map(u => u.id);
        
        const unauthorizedRecipients = input.recipientIds.filter(id => !allowedUserIds.includes(id));
        if (unauthorizedRecipients.length > 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only notify users in teams assigned to your venues',
          });
        }
      }

      // Create notifications for each recipient
      const notifications = await Promise.all(
        input.recipientIds.map(userId =>
          ctx.db.notification.create({
            data: {
              userId,
              title: input.title,
              message: input.message,
              type: input.type,
              createdBy: ctx.user.id,
              actionUrl: input.actionUrl,
              relatedEntityType: input.relatedEntityType,
              relatedEntityId: input.relatedEntityId,
              scheduledFor: input.scheduledFor,
              deliveryStatus: input.scheduledFor ? 'pending' : 'delivered',
              deliveredAt: input.scheduledFor ? null : new Date(),
            },
          })
        )
      );

      return {
        success: true,
        notificationIds: notifications.map(n => n.id),
        recipientCount: notifications.length,
      };
    }),

  // Create broadcast notification (admin/volunteers only)
  createBroadcast: protectedProcedure
    .input(createBroadcastSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create broadcasts',
        });
      }

      // Check if user can notify these target roles
      if (!canCreateNotification(ctx.user.role, input.targetRoles)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot send notifications to these user types',
        });
      }

      // Create broadcast record
      const broadcast = await ctx.db.notificationBroadcast.create({
        data: {
          title: input.title,
          message: input.message,
          type: input.type,
          targetRoles: input.targetRoles,
          targetVenueIds: input.targetVenueIds || [],
          scheduledFor: input.scheduledFor,
          status: input.scheduledFor ? 'scheduled' : 'sending',
          createdBy: ctx.user.id,
        },
      });

      // Get target users
      let targetUsers: any[] = [];

      if (ctx.user.role === 'admin') {
        // Admin can target all users of specified roles
        targetUsers = await ctx.db.user.findMany({
          where: {
            role: { in: input.targetRoles },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });
      } else {
        // Volunteers can only target users in their assigned venues
        targetUsers = await getUsersByVenueAssignment(
          ctx.db,
          ctx.user.id,
          input.targetRoles,
          input.targetVenueIds
        );
      }

      // Create individual notifications
      const notifications = await Promise.all(
        targetUsers.map(user =>
          ctx.db.notification.create({
            data: {
              userId: user.id,
              title: input.title,
              message: input.message,
              type: input.type,
              createdBy: ctx.user.id,
              broadcastId: broadcast.id,
              scheduledFor: input.scheduledFor,
              deliveryStatus: input.scheduledFor ? 'pending' : 'delivered',
              deliveredAt: input.scheduledFor ? null : new Date(),
            },
          })
        )
      );

      // Update broadcast with recipient count
      await ctx.db.notificationBroadcast.update({
        where: { id: broadcast.id },
        data: {
          totalRecipients: notifications.length,
          status: input.scheduledFor ? 'scheduled' : 'sent',
          sentAt: input.scheduledFor ? null : new Date(),
        },
      });

      return {
        success: true,
        broadcastId: broadcast.id,
        recipientCount: notifications.length,
      };
    }),

  // Get notification templates (admin only)
  getTemplates: adminProcedure
    .input(z.object({
      category: z.enum(['general', 'match', 'team', 'verification', 'system', 'emergency']).optional(),
      active: z.boolean().default(true),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      return await ctx.db.notificationTemplate.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          isActive: input.active,
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }),

  // Create notification template (admin only)
  createTemplate: adminProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.notificationTemplate.create({
        data: {
          ...input,
          createdBy: ctx.user.id,
        },
      });
    }),

  // Get broadcast history (admin/volunteers only)
  getBroadcasts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // Check permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to view broadcasts',
        });
      }

      const where = ctx.user.role === 'admin' 
        ? { deletedAt: null }
        : { createdBy: ctx.user.id, deletedAt: null };

      const broadcasts = await ctx.db.notificationBroadcast.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
        skip: input.offset,
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const total = await ctx.db.notificationBroadcast.count({ where });

      return {
        broadcasts,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get notification settings for current user
  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      let settings = await ctx.db.notificationSettings.findUnique({
        where: { userId: ctx.user.id },
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await ctx.db.notificationSettings.create({
          data: {
            userId: ctx.user.id,
          },
        });
      }

      return settings;
    }),

  // Update notification settings
  updateSettings: protectedProcedure
    .input(z.object({
      pushEnabled: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
      matchUpdates: z.boolean().optional(),
      teamUpdates: z.boolean().optional(),
      verificationUpdates: z.boolean().optional(),
      systemAnnouncements: z.boolean().optional(),
      pushSubscription: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.notificationSettings.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          ...input,
        },
        update: input,
      });
    }),

  // Get available recipients for current user (for targeting)
  getAvailableRecipients: protectedProcedure
    .input(z.object({
      roles: z.array(z.enum(['admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer', 'public'])).optional(),
      venueIds: z.array(z.string().uuid()).optional(),
      search: z.string().optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // Check permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to view recipients',
        });
      }

      const targetRoles = input.roles || ['captain', 'player'];
      
      // Check if user can target these roles
      if (!canCreateNotification(ctx.user.role, targetRoles)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot target these user types',
        });
      }

      let users: any[] = [];

      if (ctx.user.role === 'admin') {
        // Admin can see all users
        users = await ctx.db.user.findMany({
          where: {
            role: { in: targetRoles },
            deletedAt: null,
            ...(input.search ? {
              OR: [
                { firstName: { contains: input.search, mode: 'insensitive' } },
                { lastName: { contains: input.search, mode: 'insensitive' } },
                { phone: { contains: input.search } },
              ],
            } : {}),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
          },
          take: 100, // Limit for performance
        });
      } else {
        // Volunteers can only see users in their assigned venues
        users = await getUsersByVenueAssignment(
          ctx.db,
          ctx.user.id,
          targetRoles,
          input.venueIds
        );

        // Apply search filter if provided
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          users = users.filter(user => 
            user.firstName?.toLowerCase().includes(searchLower) ||
            user.lastName?.toLowerCase().includes(searchLower)
          );
        }

        users = users.slice(0, 100); // Limit for performance
      }

      return users;
    }),
});