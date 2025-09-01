
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const postsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      entityType: z.enum(['fixture', 'match']).default('fixture'),
      entityId: z.string().uuid().optional(),
      visibility: z.enum(['public', 'private']).default('public'),
      mediaIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate technical volunteer permissions
      if (!['admin', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only technical volunteers and admins can create posts',
        });
      }

      if (!input.entityId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Entity ID is required.',
        });
      }

      // For technical volunteers, verify they're assigned to the venue
      if (ctx.user.role === 'technical_volunteer') {
        let venueId: string | null = null;

        if (input.entityType === 'fixture') {
          const fixture = await db.fixture.findUnique({
            where: { id: input.entityId },
            include: {
              venueLevelMapping: {
                select: { venueId: true }
              }
            }
          });
          venueId = fixture?.venueLevelMapping.venueId || null;
        } else if (input.entityType === 'match') {
          const match = await db.match.findUnique({
            where: { id: input.entityId },
            include: {
              fixture: {
                include: {
                  venueLevelMapping: {
                    select: { venueId: true }
                  }
                }
              }
            }
          });
          venueId = match?.fixture.venueLevelMapping.venueId || null;
        }

        if (!venueId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Entity not found or venue not assigned',
          });
        }

        // Check volunteer assignment
        const assignment = await db.volunteerAssignment.findFirst({
          where: {
            volunteerId: ctx.user.id,
            venueLevelMapping: {
              venueId: venueId
            }
          }
        });

        if (!assignment) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not assigned to this venue',
          });
        }
      }

      // Get event ID from entity
      let eventId: string;
      if (input.entityType === 'fixture') {
        const fixture = await db.fixture.findUnique({
          where: { id: input.entityId },
          select: { eventId: true }
        });
        eventId = fixture?.eventId || "00000000-0000-0000-0000-000000000000";
      } else {
        const match = await db.match.findUnique({
          where: { id: input.entityId },
          include: {
            fixture: {
              select: { eventId: true }
            }
          }
        });
        eventId = match?.fixture.eventId || "00000000-0000-0000-0000-000000000000";
      }

      const post = await db.post.create({
        data: {
          title: input.title,
          content: input.content,
          entityType: input.entityType,
          entityId: input.entityId,
          visibility: input.visibility,
          authorId: ctx.user.id,
          eventId: eventId,
        },
      });

      if (input.mediaIds && input.mediaIds.length > 0) {
        await db.media.updateMany({
          where: {
            id: { in: input.mediaIds },
            uploadedBy: ctx.user.id, // Ensure user owns the media
          },
          data: {
            postId: post.id,
            entityType: 'post',
            entityId: post.id,
          },
        });
      }

      return post;
    }),

  getByContext: protectedProcedure
    .input(z.object({
      entityType: z.enum(['fixture', 'match']),
      entityId: z.string().uuid(),
      visibility: z.enum(['public', 'private', 'all']).default('public'),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      const where: any = {
        entityType: input.entityType,
        entityId: input.entityId,
      };

      if (input.visibility !== 'all') {
        where.visibility = input.visibility;
      }

      // If user is not admin, only show public posts or own posts
      if (ctx.user.role !== 'admin' && input.visibility === 'all') {
        where.OR = [
          { visibility: 'public' },
          { authorId: ctx.user.id },
        ];
      } else if (ctx.user.role !== 'admin') {
        where.visibility = 'public';
      }

      const posts = await db.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImages: true,
            },
          },
          media: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return posts;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).optional().default({}))
    .mutation(async ({ input, ctx }) => {
      const post = await db.post.findUnique({
        where: { id: input.id },
      });

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await db.post.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
