import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const venueDataSyncRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      lastSyncTimestamp: z.date().optional()
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
            message: 'You do not have access to this venue'
          });
        }

        // Get venue matches
        const matches = await db.match.findMany({
          where: {
            venueId: input.venueId,
            ...(input.lastSyncTimestamp && {
              updatedAt: { gte: input.lastSyncTimestamp }
            })
          },
          include: {
            team1: { select: { id: true, name: true } },
            team2: { select: { id: true, name: true } },
            venue: { select: { id: true, name: true } }
          },
          orderBy: { scheduledTime: 'asc' }
        });

        // Get venue chat messages
        const chatMessages = await db.venueChat.findMany({
          where: {
            venueId: input.venueId,
            ...(input.lastSyncTimestamp && {
              createdAt: { gte: input.lastSyncTimestamp }
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
          take: 50
        });

        // Get venue media
        const media = await db.venueMedia.findMany({
          where: {
            venueId: input.venueId,
            approvalStatus: 'approved',
            ...(input.lastSyncTimestamp && {
              createdAt: { gte: input.lastSyncTimestamp }
            })
          },
          include: {
            uploader: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            },
            _count: {
              select: { likes: true, comments: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });

        // Get venue participants
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

        const participants = venueAssignments.flatMap(assignment => 
          assignment.team.teamPlayers.map(tp => ({
            id: tp.user.id,
            name: `${tp.user.firstName} ${tp.user.lastName}`,
            role: tp.user.role,
            position: tp.position,
            teamId: assignment.team.id,
            teamName: assignment.team.name,
            profileImage: tp.user.profileImages?.profilePhotoPath
          }))
        );

        return {
          matches: matches.map(match => ({
            id: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Name: match.team1?.name,
            team2Name: match.team2?.name,
            team1Score: match.team1Score,
            team2Score: match.team2Score,
            scheduledTime: match.scheduledTime,
            actualStartTime: match.actualStartTime,
            completedAt: match.completedAt,
            status: match.status,
            venueId: match.venueId,
            venueName: match.venue?.name,
            round: match.round,
            updatedAt: match.updatedAt
          })),
          chatMessages: chatMessages.map(msg => ({
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
          media: media.map(item => ({
            id: item.id,
            venueId: item.venueId,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            caption: item.caption,
            description: item.description,
            likes: item._count.likes,
            comments: item._count.comments,
            uploader: `${item.uploader.firstName} ${item.uploader.lastName}`,
            uploaderRole: item.uploader.role,
            createdAt: item.createdAt,
            metadata: item.metadata
          })),
          participants,
          syncTimestamp: new Date()
        };
      } catch (error) {
        console.error('Venue data sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync venue data'
        });
      }
    })
});
