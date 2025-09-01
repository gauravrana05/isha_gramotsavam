import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  // Send message to venue participants
  sendMessage: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      content: z.string().min(1).max(500),
      targetType: z.enum(['all', 'captains', 'players', 'individual']),
      targetId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { venueId, content, targetType, targetId } = input;
      
      // Verify user is volunteer/admin for this venue
      const userRole = await ctx.db.user.findFirst({
        where: { 
          id: ctx.session.user.id,
          OR: [
            { role: 'admin' },
            { 
              volunteerAssignments: {
                some: { venueId }
              }
            }
          ]
        }
      });

      if (!userRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized for this venue"
        });
      }

      // Create message
      const message = await ctx.db.chatMessage.create({
        data: {
          content,
          venueId,
          senderId: ctx.session.user.id,
          senderRole: userRole.role,
          targetType,
          targetId,
        },
        include: {
          sender: {
            select: { name: true, role: true }
          }
        }
      });

      return message;
    }),

  // Get messages for venue
  getVenueMessages: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { venueId, limit } = input;

      // Check if user has access to venue
      const hasAccess = await ctx.db.user.findFirst({
        where: {
          id: ctx.session.user.id,
          OR: [
            { role: 'admin' },
            { 
              volunteerAssignments: {
                some: { venueId }
              }
            },
            {
              teams: {
                some: {
                  matches: {
                    some: { venueId }
                  }
                }
              }
            }
          ]
        }
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No access to venue messages"
        });
      }

      const messages = await ctx.db.chatMessage.findMany({
        where: {
          venueId,
          OR: [
            { targetType: 'all' },
            { 
              targetType: 'captains',
              ...(ctx.session.user.role === 'captain' ? {} : { senderRole: { in: ['volunteer', 'admin'] } })
            },
            { 
              targetType: 'players',
              ...(ctx.session.user.role === 'player' ? {} : { senderRole: { in: ['volunteer', 'admin'] } })
            },
            { 
              targetType: 'individual',
              targetId: ctx.session.user.id
            }
          ]
        },
        include: {
          sender: {
            select: { name: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return messages.reverse();
    }),

  // Get venue participants for filtering
  getVenueParticipants: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { venueId } = input;

      // Only volunteers/admins can see participants
      const isAuthorized = await ctx.db.user.findFirst({
        where: {
          id: ctx.session.user.id,
          OR: [
            { role: 'admin' },
            { 
              volunteerAssignments: {
                some: { venueId }
              }
            }
          ]
        }
      });

      if (!isAuthorized) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized"
        });
      }

      // Get players and captains with teams at this venue
      const participants = await ctx.db.user.findMany({
        where: {
          teams: {
            some: {
              matches: {
                some: { venueId }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          role: true,
          teams: {
            select: {
              name: true
            }
          }
        }
      });

      return participants;
    }),

  // Mark messages as read
  markAsRead: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.chatMessage.updateMany({
        where: {
          venueId: input.venueId,
          OR: [
            { targetType: 'all' },
            { targetType: ctx.session.user.role === 'captain' ? 'captains' : 'players' },
            { targetId: ctx.session.user.id }
          ]
        },
        data: {
          isRead: true
        }
      });

      return { success: true };
    }),
});
