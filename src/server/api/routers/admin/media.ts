import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, adminProcedure } from '../../trpc'

export const adminMediaRouter = createTRPCRouter({
  // Get all posts with comprehensive filtering
  getAllPosts: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(25),
      offset: z.number().min(0).default(0),
      venueId: z.string().uuid().optional(),
      authorId: z.string().uuid().optional(),
      visibility: z.enum(['public', 'private', 'all']).default('all'),
      entityType: z.enum(['fixture', 'match', 'all']).default('all'),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {};

      // Venue filtering
      if (input.venueId) {
        where.OR = [
          {
            entityType: 'fixture',
            entityId: {
              in: await db.fixture.findMany({
                where: {
                  venueLevelMapping: {
                    venueId: input.venueId
                  }
                },
                select: { id: true }
              }).then(fixtures => fixtures.map(f => f.id))
            }
          },
          {
            entityType: 'match',
            entityId: {
              in: await db.match.findMany({
                where: {
                  fixture: {
                    venueLevelMapping: {
                      venueId: input.venueId
                    }
                  }
                },
                select: { id: true }
              }).then(matches => matches.map(m => m.id))
            }
          }
        ];
      }

      // Author filtering
      if (input.authorId) {
        where.authorId = input.authorId;
      }

      // Visibility filtering
      if (input.visibility !== 'all') {
        where.visibility = input.visibility;
      }

      // Entity type filtering
      if (input.entityType !== 'all') {
        where.entityType = input.entityType;
      }

      // Date filtering
      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) where.createdAt.gte = input.dateFrom;
        if (input.dateTo) where.createdAt.lte = input.dateTo;
      }

      const [posts, total] = await Promise.all([
        db.post.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              }
            },
            media: true,
            event: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: input.limit,
          skip: input.offset,
        }),
        db.post.count({ where })
      ]);

      return {
        posts,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get all media with filtering
  getAllMedia: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(25),
      offset: z.number().min(0).default(0),
      venueId: z.string().uuid().optional(),
      uploadedBy: z.string().uuid().optional(),
      entityType: z.enum(['venue', 'fixture', 'match', 'team', 'user', 'post', 'all']).default('all'),
      status: z.enum(['pending', 'approved', 'rejected', 'all']).default('all'),
      fileType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {};

      // Venue filtering (for venue, fixture, match entities)
      if (input.venueId) {
        where.OR = [
          {
            entityType: 'venue',
            entityId: input.venueId
          },
          {
            entityType: 'fixture',
            entityId: {
              in: await db.fixture.findMany({
                where: {
                  venueLevelMapping: {
                    venueId: input.venueId
                  }
                },
                select: { id: true }
              }).then(fixtures => fixtures.map(f => f.id))
            }
          },
          {
            entityType: 'match',
            entityId: {
              in: await db.match.findMany({
                where: {
                  fixture: {
                    venueLevelMapping: {
                      venueId: input.venueId
                    }
                  }
                },
                select: { id: true }
              }).then(matches => matches.map(m => m.id))
            }
          }
        ];
      }

      // Uploader filtering
      if (input.uploadedBy) {
        where.uploadedBy = input.uploadedBy;
      }

      // Entity type filtering
      if (input.entityType !== 'all') {
        where.entityType = input.entityType;
      }

      // Status filtering
      if (input.status !== 'all') {
        where.status = input.status;
      }

      // File type filtering
      if (input.fileType) {
        where.fileType = {
          contains: input.fileType,
          mode: 'insensitive'
        };
      }

      const [media, total] = await Promise.all([
        db.media.findMany({
          where,
          include: {
            uploadedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              }
            },
            post: {
              select: {
                id: true,
                title: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: input.limit,
          skip: input.offset,
        }),
        db.media.count({ where })
      ]);

      return {
        media,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get venue list for filtering
  getVenuesForFilter: adminProcedure
    .query(async () => {
      const venues = await db.venue.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc'
        }
      });

      return venues;
    }),

  // Get volunteers for filtering
  getVolunteersForFilter: adminProcedure
    .query(async () => {
      const volunteers = await db.user.findMany({
        where: {
          role: {
            in: ['technical_volunteer', 'verification_volunteer', 'general_volunteer']
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      });

      return volunteers;
    }),

  // Update media status (approve/reject)
  updateMediaStatus: adminProcedure
    .input(z.object({
      mediaId: z.string().uuid(),
      status: z.enum(['approved', 'rejected']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const media = await db.media.update({
        where: { id: input.mediaId },
        data: {
          status: input.status,
          updatedAt: new Date(),
        }
      });

      return media;
    }),

  // Delete post
  deletePost: adminProcedure
    .input(z.object({
      postId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Delete associated media first
      await db.media.updateMany({
        where: { postId: input.postId },
        data: { postId: null }
      });

      // Delete the post
      await db.post.delete({
        where: { id: input.postId }
      });

      return { success: true };
    }),

  // Delete media
  deleteMedia: adminProcedure
    .input(z.object({
      mediaId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await db.media.delete({
        where: { id: input.mediaId }
      });

      return { success: true };
    }),

  // Get media statistics
  getMediaStats: adminProcedure
    .query(async () => {
      const [
        totalMedia,
        pendingMedia,
        approvedMedia,
        rejectedMedia,
        totalPosts,
        publicPosts,
        privateePosts,
        mediaByType
      ] = await Promise.all([
        db.media.count(),
        db.media.count({ where: { status: 'pending' } }),
        db.media.count({ where: { status: 'approved' } }),
        db.media.count({ where: { status: 'rejected' } }),
        db.post.count(),
        db.post.count({ where: { visibility: 'public' } }),
        db.post.count({ where: { visibility: 'private' } }),
        db.media.groupBy({
          by: ['fileType'],
          _count: true,
        })
      ]);

      return {
        media: {
          total: totalMedia,
          pending: pendingMedia,
          approved: approvedMedia,
          rejected: rejectedMedia,
        },
        posts: {
          total: totalPosts,
          public: publicPosts,
          private: privateePosts,
        },
        mediaByType: mediaByType.map(item => ({
          type: item.fileType,
          count: item._count,
        }))
      };
    }),
});
