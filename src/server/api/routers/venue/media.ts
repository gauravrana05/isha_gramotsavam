import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const venueMediaRouter = createTRPCRouter({
  getFeed: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(20).default(10),
      type: z.enum(['all', 'image', 'video']).default('all')
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
            message: 'You do not have access to this venue media'
          });
        }

        const skip = (input.page - 1) * input.limit;

        const mediaItems = await db.venueMedia.findMany({
          where: {
            venueId: input.venueId,
            approvalStatus: 'approved',
            ...(input.type !== 'all' && { type: input.type })
          },
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit
        });

        // Check if user has liked each media item
        const mediaIds = mediaItems.map(item => item.id);
        const userLikes = await db.venueMediaLike.findMany({
          where: {
            mediaId: { in: mediaIds },
            userId: user.id
          }
        });

        const likedMediaIds = new Set(userLikes.map(like => like.mediaId));

        return {
          mediaItems: mediaItems.map(item => ({
            id: item.id,
            venueId: item.venueId,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            caption: item.caption,
            description: item.description,
            likes: item._count.likes,
            comments: item._count.comments,
            isLiked: likedMediaIds.has(item.id),
            uploader: {
              id: item.uploader.id,
              name: `${item.uploader.firstName} ${item.uploader.lastName}`,
              role: item.uploader.role
            },
            createdAt: item.createdAt,
            metadata: item.metadata
          })),
          hasMore: mediaItems.length === input.limit,
          page: input.page
        };
      } catch (error) {
        console.error('Get venue media error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue media'
        });
      }
    }),

  likeMedia: protectedProcedure
    .input(z.object({
      mediaId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Check if already liked
        const existingLike = await db.venueMediaLike.findUnique({
          where: {
            mediaId_userId: {
              mediaId: input.mediaId,
              userId: user.id
            }
          }
        });

        if (existingLike) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Media already liked'
          });
        }

        // Create like
        await db.venueMediaLike.create({
          data: {
            mediaId: input.mediaId,
            userId: user.id
          }
        });

        // Get updated like count
        const likeCount = await db.venueMediaLike.count({
          where: { mediaId: input.mediaId }
        });

        return {
          success: true,
          likeCount
        };
      } catch (error) {
        console.error('Like media error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to like media'
        });
      }
    }),

  unlikeMedia: protectedProcedure
    .input(z.object({
      mediaId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Remove like
        await db.venueMediaLike.delete({
          where: {
            mediaId_userId: {
              mediaId: input.mediaId,
              userId: user.id
            }
          }
        });

        // Get updated like count
        const likeCount = await db.venueMediaLike.count({
          where: { mediaId: input.mediaId }
        });

        return {
          success: true,
          likeCount
        };
      } catch (error) {
        console.error('Unlike media error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unlike media'
        });
      }
    }),

  getComments: protectedProcedure
    .input(z.object({
      mediaId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(20).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        const skip = (input.page - 1) * input.limit;

        const comments = await db.venueMediaComment.findMany({
          where: { mediaId: input.mediaId },
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
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take: input.limit
        });

        return {
          comments: comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            user: {
              id: comment.user.id,
              name: `${comment.user.firstName} ${comment.user.lastName}`,
              role: comment.user.role,
              profileImage: comment.user.profileImages?.profilePhotoPath
            },
            createdAt: comment.createdAt,
            editedAt: comment.editedAt
          })),
          hasMore: comments.length === input.limit,
          page: input.page
        };
      } catch (error) {
        console.error('Get media comments error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch comments'
        });
      }
    })
});
