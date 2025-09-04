import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const userNotificationsSyncRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(z.object({
      lastSyncTimestamp: z.date().optional(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        const notifications = await db.notification.findMany({
          where: {
            userId: user.id,
            ...(input.lastSyncTimestamp && {
              OR: [
                { createdAt: { gte: input.lastSyncTimestamp } },
                { updatedAt: { gte: input.lastSyncTimestamp } }
              ]
            })
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit
        });

        return {
          notifications: notifications.map(notif => ({
            id: notif.id,
            userId: notif.userId,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            actionUrl: notif.actionUrl,
            metadata: notif.metadata,
            createdAt: notif.createdAt,
            updatedAt: notif.updatedAt
          })),
          unreadCount: notifications.filter(n => !n.read).length,
          syncTimestamp: new Date()
        };
      } catch (error) {
        console.error('User notifications sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync notifications'
        });
      }
    }),

  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        const notification = await db.notification.update({
          where: {
            id: input.notificationId,
            userId: user.id
          },
          data: { read: true }
        });

        return {
          success: true,
          notification: {
            id: notification.id,
            read: notification.read,
            updatedAt: notification.updatedAt
          }
        };
      } catch (error) {
        console.error('Mark notification as read error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read'
        });
      }
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { user, db } = ctx;

      try {
        const result = await db.notification.updateMany({
          where: {
            userId: user.id,
            read: false
          },
          data: { read: true }
        });

        return {
          success: true,
          updatedCount: result.count
        };
      } catch (error) {
        console.error('Mark all notifications as read error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark all notifications as read'
        });
      }
    })
});
