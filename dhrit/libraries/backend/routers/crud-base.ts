import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export function createCRUDRouter<T extends Record<string, any>>(
  model: string,
  createSchema: z.ZodSchema<T>,
  updateSchema: z.ZodSchema<Partial<T>>
) {
  return router({
    getAll: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, search, sortBy, sortOrder } = input;
        const skip = (page - 1) * limit;

        const where = search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        } : {};

        const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: sortOrder };

        const [items, total] = await Promise.all([
          (ctx.prisma as any)[model].findMany({
            where,
            skip,
            take: limit,
            orderBy,
          }),
          (ctx.prisma as any)[model].count({ where }),
        ]);

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          }
        };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const item = await (ctx.prisma as any)[model].findUnique({
          where: { id: input.id }
        });

        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `${model} not found`
          });
        }

        return item;
      }),

    create: protectedProcedure
      .input(createSchema)
      .mutation(async ({ input, ctx }) => {
        const item = await (ctx.prisma as any)[model].create({
          data: {
            ...input,
            userId: ctx.user.id,
          }
        });

        return item;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        data: updateSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        const existingItem = await (ctx.prisma as any)[model].findUnique({
          where: { id: input.id }
        });

        if (!existingItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `${model} not found`
          });
        }

        if (existingItem.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this item'
          });
        }

        const item = await (ctx.prisma as any)[model].update({
          where: { id: input.id },
          data: input.data,
        });

        return item;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const existingItem = await (ctx.prisma as any)[model].findUnique({
          where: { id: input.id }
        });

        if (!existingItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `${model} not found`
          });
        }

        if (existingItem.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this item'
          });
        }

        await (ctx.prisma as any)[model].delete({
          where: { id: input.id }
        });

        return { success: true };
      }),
  });
}
