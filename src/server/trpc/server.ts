import 'server-only'

import {
  createTRPCProxyClient,
  loggerLink,
  TRPCClientError,
} from '@trpc/client'
import { callTRPCProcedure } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { type TRPCErrorResponse } from '@trpc/server/rpc'
import { cookies } from 'next/headers'
import { cache } from 'react'
import superjson from 'superjson'
import type { CreateNextContextOptions } from '@trpc/server/adapters/next'

import { appRouter, type AppRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const cookieStore = await cookies();
  
  // Create proper mock request/response objects for server-side usage
  const mockReq = {
    headers: {
      cookie: cookieStore.toString(),
      'x-trpc-source': 'rsc',
    },
    cookies: {},
  } as CreateNextContextOptions['req']

  const mockRes = {
    setHeader: () => {},
    getHeader: () => undefined,
  } as CreateNextContextOptions['res']

  return createTRPCContext({
    req: mockReq,
    res: mockRes,
  })
})

export const api = createTRPCProxyClient<AppRouter>({
  // transformer: superjson, // Disabled to fix input validation issues
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === 'development' ||
        (op.direction === 'down' && op.result instanceof Error),
    }),
    /**
     * Custom RSC link that lets us invoke procedures without using http requests. Since Server
     * Components always run on the server, we can just call the procedure as a function.
     */
    () =>
      ({ op }) =>
        observable((observer) => {
          createContext()
            .then((ctx) => {
              return callTRPCProcedure({
                router: appRouter,
                path: op.path,
                input: op.input,
                ctx,
                type: op.type,
              })
            })
            .then((data) => {
              observer.next({ result: { data } })
              observer.complete()
            })
            .catch((cause: TRPCErrorResponse) => {
              observer.error(TRPCClientError.from(cause))
            })
        }),
  ],
})
