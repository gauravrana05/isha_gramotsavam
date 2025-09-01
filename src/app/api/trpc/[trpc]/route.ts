import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'
import superjson from 'superjson'

import { env } from '@/lib/env'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    // transformer: superjson, // Temporarily disabled
    createContext: async ({ req, resHeaders }) => {
      // Create mock req/res objects that match what createTRPCContext expects
      const mockReq = {
        cookies: Object.fromEntries(
          req.headers.get('cookie')?.split(';')
            .map(cookie => cookie.trim().split('=').map(part => part.trim())) || []
        ),
        headers: Object.fromEntries(req.headers.entries()),
      }
      const mockRes = {}
      
      return await createTRPCContext({
        req: mockReq,
        res: mockRes,
        info: { isBatchCall: false, calls: [] } // Add required info property
      } as any)
    },
    onError:
      env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            )
          }
        : undefined,
  })

export { handler as GET, handler as POST }