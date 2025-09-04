import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const venueChatRouter = createTRPCRouter({
  getMessages: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      since: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Verify user has access to this venue
        const hasAccess = await db.teamVenueAssignment.findFirst({
          where: {
            clusterVenueMapping: { venueId: input.venueId },
            team: {
              OR: [
                { captainId: user.id },
                { teamPlayers: { some: { userId: user.id } } }
              ]
            }
          }
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this venue chat'
          });
        }

        const skip = (input.page - 1) * input.limit;

        const messages = await db.venueChat.findMany({
          where: {
            venueId: input.venueId,
            ...(input.since && {
              createdAt: { gte: input.since }
            })
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                profileImages: {
                  select: { profilePhotoPath: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit
        });

        return {
          messages: messages.map(msg => ({
            id: msg.id,
            venueId: msg.venueId,
            senderId: msg.senderId,
            senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
            senderRole: msg.sender.role,
            senderImage: msg.sender.profileImages?.profilePhotoPath,
            content: msg.content,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            createdAt: msg.createdAt,
            editedAt: msg.editedAt
          })),
          hasMore: messages.length === input.limit,
          page: input.page
        };
      } catch (error) {
        console.error('Get venue messages error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue messages'
        });
      }
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      content: z.string().min(1).max(1000),
      type: z.enum(['text', 'image']).default('text'),
      mediaUrl: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Verify user has access to this venue
        const hasAccess = await db.teamVenueAssignment.findFirst({
          where: {
            clusterVenueMapping: { venueId: input.venueId },
            team: {
              OR: [
                { captainId: user.id },
                { teamPlayers: { some: { userId: user.id } } }
              ]
            }
          }
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this venue chat'
          });
        }

        const message = await db.venueChat.create({
          data: {
            venueId: input.venueId,
            senderId: user.id,
            content: input.content,
            type: input.type,
            mediaUrl: input.mediaUrl
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                profileImages: {
                  select: { profilePhotoPath: true }
                }
              }
            }
          }
        });

        return {
          id: message.id,
          venueId: message.venueId,
          senderId: message.senderId,
          senderName: `${message.sender.firstName} ${message.sender.lastName}`,
          senderRole: message.sender.role,
          senderImage: message.sender.profileImages?.profilePhotoPath,
          content: message.content,
          type: message.type,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt
        };
      } catch (error) {
        console.error('Send venue message error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message'
        });
      }
    }),

  getParticipants: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Get all teams assigned to this venue
        const venueAssignments = await db.teamVenueAssignment.findMany({
          where: {
            clusterVenueMapping: { venueId: input.venueId }
          },
          include: {
            team: {
              include: {
                teamPlayers: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        profileImages: {
                          select: { profilePhotoPath: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const participants = [];

        // Add all team players and captains
        for (const assignment of venueAssignments) {
          for (const teamPlayer of assignment.team.teamPlayers) {
            participants.push({
              id: teamPlayer.user.id,
              name: `${teamPlayer.user.firstName} ${teamPlayer.user.lastName}`,
              role: teamPlayer.user.role,
              position: teamPlayer.position,
              teamName: assignment.team.name,
              profileImage: teamPlayer.user.profileImages?.profilePhotoPath
            });
          }
        }

        // Add volunteers assigned to this venue
        const volunteers = await db.volunteerAssignment.findMany({
          where: {
            venueLevelMapping: { venueId: input.venueId },
            status: 'active'
          },
          include: {
            volunteer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                profileImages: {
                  select: { profilePhotoPath: true }
                }
              }
            }
          }
        });

        for (const assignment of volunteers) {
          participants.push({
            id: assignment.volunteer.id,
            name: `${assignment.volunteer.firstName} ${assignment.volunteer.lastName}`,
            role: assignment.volunteer.role,
            position: 'volunteer',
            teamName: null,
            profileImage: assignment.volunteer.profileImages?.profilePhotoPath
          });
        }

        return {
          participants,
          counts: {
            captains: participants.filter(p => p.position === 'captain').length,
            players: participants.filter(p => p.position === 'player').length,
            volunteers: participants.filter(p => p.position === 'volunteer').length,
            total: participants.length
          }
        };
      } catch (error) {
        console.error('Get venue participants error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue participants'
        });
      }
    })
});
