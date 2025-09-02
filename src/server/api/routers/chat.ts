import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  // Send message to venue participants
  sendMessage: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      content: z.string().min(1).max(500),
      targetType: z.enum(['all', 'captains', 'players', 'individual', 'volunteers']),
      targetId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { venueId, content, targetType, targetId } = input;
      
      // Verify user has access to this venue (volunteers, admins, players, captains)
      const userAccess = await ctx.db.user.findFirst({
        where: { 
          id: ctx.session.user.id,
          OR: [
            // Admins can message anywhere
            { role: 'admin' },
            // Volunteers assigned to venue
            { 
              volunteerAssignments: {
                some: { venueId }
              }
            },
            // Players/Captains with teams at this venue
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

      if (!userAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized for this venue"
        });
      }

      // Define message restrictions based on sender role
      const isVolunteerOrAdmin = ['volunteer', 'admin'].includes(userAccess.role);
      const isPlayerOrCaptain = ['player', 'captain'].includes(userAccess.role);

      // Validate target type based on sender role
      if (isPlayerOrCaptain) {
        // Players and captains can only send to volunteers/admins or reply to individual messages
        if (!['volunteers', 'individual'].includes(targetType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Players and captains can only message volunteers or send individual replies"
          });
        }

        // For individual messages, ensure they're replying to someone who messaged them
        if (targetType === 'individual' && targetId) {
          const originalMessage = await ctx.db.chatMessage.findFirst({
            where: {
              venueId,
              senderId: targetId,
              OR: [
                { targetType: 'all' },
                { targetType: userAccess.role === 'captain' ? 'captains' : 'players' },
                { targetId: ctx.session.user.id }
              ]
            }
          });

          if (!originalMessage) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Can only reply to users who have messaged you"
            });
          }
        }
      }

      // Create message
      const message = await ctx.db.chatMessage.create({
        data: {
          content,
          venueId,
          senderId: ctx.session.user.id,
          senderRole: userAccess.role,
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
    }).optional().default({}))
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
              targetType: 'volunteers',
              ...(ctx.session.user.role === 'volunteer' ? {} : { senderRole: { in: ['player', 'captain'] } })
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
    }).optional().default({}))
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

  // Get venue volunteers for players/captains to message
  getVenueVolunteers: protectedProcedure
    .input(z.object({
      venueId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { venueId } = input;

      // Only players/captains need this info
      if (!['player', 'captain'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only players and captains can access this"
        });
      }

      // Check if user has access to venue
      const hasAccess = await ctx.db.user.findFirst({
        where: {
          id: ctx.session.user.id,
          teams: {
            some: {
              matches: {
                some: { venueId }
              }
            }
          }
        }
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No access to venue volunteers"
        });
      }

      // Get volunteers assigned to this venue
      const volunteers = await ctx.db.user.findMany({
        where: {
          volunteerAssignments: {
            some: { venueId }
          }
        },
        select: {
          id: true,
          name: true,
          role: true,
        }
      });

      return volunteers;
    }),
});
