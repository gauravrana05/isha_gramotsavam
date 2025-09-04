import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import webpush from 'web-push';

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@ishagramotsavam.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export const pushNotificationRouter = createTRPCRouter({
  subscribe: protectedProcedure
    .input(z.object({
      subscription: pushSubscriptionSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Save or update push subscription
        await db.notificationSettings.upsert({
          where: { userId: user.id },
          update: {
            pushSubscription: input.subscription,
            pushEnabled: true,
            updatedAt: new Date()
          },
          create: {
            userId: user.id,
            pushSubscription: input.subscription,
            pushEnabled: true,
            emailEnabled: true,
            smsEnabled: false
          }
        });

        return {
          success: true,
          message: 'Push subscription saved successfully'
        };
      } catch (error) {
        console.error('Error saving push subscription:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save push subscription'
        });
      }
    }),

  unsubscribe: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { user, db } = ctx;

      try {
        await db.notificationSettings.update({
          where: { userId: user.id },
          data: {
            pushSubscription: null,
            pushEnabled: false,
            updatedAt: new Date()
          }
        });

        return {
          success: true,
          message: 'Push subscription removed successfully'
        };
      } catch (error) {
        console.error('Error removing push subscription:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove push subscription'
        });
      }
    }),

  sendPush: protectedProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      body: z.string(),
      data: z.any().optional(),
      actions: z.array(z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().optional()
      })).optional(),
      icon: z.string().optional(),
      badge: z.string().optional(),
      image: z.string().optional(),
      tag: z.string().optional(),
      requireInteraction: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        // Get user's push subscription
        const notificationSettings = await db.notificationSettings.findUnique({
          where: { userId: input.userId }
        });

        if (!notificationSettings?.pushSubscription || !notificationSettings.pushEnabled) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User has no active push subscription'
          });
        }

        const subscription = notificationSettings.pushSubscription as any;
        
        const payload = JSON.stringify({
          title: input.title,
          body: input.body,
          icon: input.icon || '/icons/android/android-launchericon-192-192.png',
          badge: input.badge || '/icons/android/android-launchericon-96-96.png',
          image: input.image,
          data: input.data,
          actions: input.actions,
          tag: input.tag,
          requireInteraction: input.requireInteraction || false,
          timestamp: Date.now()
        });

        // Send push notification
        await webpush.sendNotification(subscription, payload);

        // Log the notification
        await db.notification.create({
          data: {
            userId: input.userId,
            title: input.title,
            message: input.body,
            type: 'push',
            read: false,
            metadata: {
              pushSent: true,
              sentAt: new Date().toISOString()
            }
          }
        });

        return {
          success: true,
          message: 'Push notification sent successfully'
        };
      } catch (error) {
        console.error('Error sending push notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send push notification'
        });
      }
    }),

  sendBulkPush: protectedProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      title: z.string(),
      body: z.string(),
      data: z.any().optional(),
      actions: z.array(z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().optional()
      })).optional(),
      icon: z.string().optional(),
      tag: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        // Get all users' push subscriptions
        const notificationSettings = await db.notificationSettings.findMany({
          where: {
            userId: { in: input.userIds },
            pushEnabled: true,
            pushSubscription: { not: null }
          }
        });

        const payload = JSON.stringify({
          title: input.title,
          body: input.body,
          icon: input.icon || '/icons/android/android-launchericon-192-192.png',
          badge: '/icons/android/android-launchericon-96-96.png',
          data: input.data,
          actions: input.actions,
          tag: input.tag,
          timestamp: Date.now()
        });

        // Send push notifications in parallel
        const sendPromises = notificationSettings.map(async (settings) => {
          try {
            await webpush.sendNotification(settings.pushSubscription as any, payload);
            
            // Log successful notification
            await db.notification.create({
              data: {
                userId: settings.userId,
                title: input.title,
                message: input.body,
                type: 'push',
                read: false,
                metadata: {
                  pushSent: true,
                  sentAt: new Date().toISOString()
                }
              }
            });
            
            return { userId: settings.userId, success: true };
          } catch (error) {
            console.error(`Failed to send push to user ${settings.userId}:`, error);
            return { userId: settings.userId, success: false, error: error.message };
          }
        });

        const results = await Promise.all(sendPromises);
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
          success: true,
          message: `Sent ${successCount} notifications, ${failureCount} failed`,
          results: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
            details: results
          }
        };
      } catch (error) {
        console.error('Error sending bulk push notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send bulk push notifications'
        });
      }
    }),

  getSubscriptionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const { user, db } = ctx;

      try {
        const notificationSettings = await db.notificationSettings.findUnique({
          where: { userId: user.id }
        });

        return {
          hasSubscription: !!notificationSettings?.pushSubscription,
          pushEnabled: notificationSettings?.pushEnabled || false,
          emailEnabled: notificationSettings?.emailEnabled || false,
          smsEnabled: notificationSettings?.smsEnabled || false
        };
      } catch (error) {
        console.error('Error getting subscription status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get subscription status'
        });
      }
    })
});
