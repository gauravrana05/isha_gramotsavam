import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists'
        });
      }

      const hashedPassword = await hashPassword(input.password);
      
      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
        }
      });

      const token = generateToken({ userId: user.id });

      return { user, token };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email }
      });

      if (!user || !await verifyPassword(input.password, user.password)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        });
      }

      const token = generateToken({ userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token
      };
    }),

  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
      }

      return ctx.user;
    }),

  refreshToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const payload = verifyToken(input.token);
        const newToken = generateToken({ userId: payload.userId });
        return { token: newToken };
      } catch {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        });
      }
    }),
});
