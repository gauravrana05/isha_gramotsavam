import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { redis, safeRedisOperation } from '@/lib/redis'
import { db } from '@/lib/db'

const STALE_TIME = 60; // 60 seconds

// Define proper user type
interface ContextUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
  role: string;
}

// Create context for tRPC
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts

  // Get user from session/cookies
  let user: ContextUser | null = null;
  try {
    // Check for user ID in cookies or headers
    const userId = req.cookies?.userId || req.headers.userid as string;
    if (userId) {
      // Try to get user from cache, fallback to database
      user = await safeRedisOperation(
        async (redis) => {
          const cachedUser = await redis.get(`user:${userId}`);
          if (cachedUser) {
            return JSON.parse(cachedUser);
          }
          return null;
        },
        async () => null
      );

      // If not in cache, fetch from database
      if (!user) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          }
        });
        
        if (dbUser) {
          user = dbUser;
          // Cache the user if found
          await safeRedisOperation(
            async (redis) => {
              await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', STALE_TIME);
            },
            async () => {} // No-op fallback
          );
        }
      }
    }
  } catch (error) {
    console.error('Failed to get user in tRPC context:', error);
  }

  return {
    req,
    res,
    user,
    db, // Add db to context
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Export router and procedure helpers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Ensure user is available in the context
    },
  })
})

// Admin procedure - for admin-only operations
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({
    ctx,
  })
})