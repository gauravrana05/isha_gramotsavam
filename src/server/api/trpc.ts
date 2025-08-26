import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import superjson from 'superjson'
import { ZodError } from 'zod'

// Create context for tRPC
export const createTRPCContext = (opts: CreateNextContextOptions) => {
  const { req, res } = opts

  // TODO: Add authentication context when Isha SSO is implemented
  // For now, return basic context
  return {
    req,
    res,
    // user: null, // Will be populated after auth implementation
  }
}

// Alternative context creation for App Router
export const createTRPCContextApp = () => {
  // TODO: Add authentication context when Isha SSO is implemented
  // For now, return basic context
  return {}
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  // transformer: superjson, // Temporarily disable to debug
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

// Protected procedure - will be implemented after auth
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Implement authentication check
  // For now, just pass through - will be updated with Isha SSO
  return next({
    ctx,
  })
})

// Admin procedure - for admin-only operations
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // TODO: Check if user is admin
  // For now, just pass through - will be updated with role-based auth
  return next({
    ctx,
  })
})