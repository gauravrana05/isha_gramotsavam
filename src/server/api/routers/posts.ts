
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
      // TODO: Auto-detect volunteer's current fixture/match context
      // For now, we'll require entityId to be passed
      if (!input.entityId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Entity ID is required for now.',
        });
      }

      const post = await db.post.create({
        data: {
          title: input.title,
          content: input.content,
          entityType: input.entityType,
          entityId: input.entityId,
          visibility: input.visibility,
          authorId: ctx.user.id,
          // TODO: This is a placeholder, need to get the event from the entity
          eventId: "00000000-0000-0000-0000-000000000000", 
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
    }))
    .query(async ({ input, ctx }) => {
      const where: any = {
        entityType: input.entityType,
        entityId: input.entityId,
      };

      if (input.visibility !== 'all') {
        where.visibility = input.visibility;
      }

      // If user is not admin, only show public posts
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
    .input(z.object({ id: z.string().uuid() }))
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
