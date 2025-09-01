'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import superjson from 'superjson'

import { type AppRouter } from '@/server/api/root'

export const api = createTRPCReact<AppRouter>()

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: process.env.NODE_ENV === 'development' ? 5 * 1000 : 30 * 1000, // 5s in dev, 30s in prod
        gcTime: process.env.NODE_ENV === 'development' ? 1000 * 60 * 1 : 1000 * 60 * 5, // 1min in dev, 5min in prod
      },
    },
  })

let clientQueryClientSingleton: QueryClient | undefined = undefined

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient())
}

export function TRPCReactProvider(props: {
  children: React.ReactNode
  cookies: string
}) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          url: '/api/trpc',
          headers() {
            return {
              cookie: props.cookies,
              'x-trpc-source': 'react',
            }
          },
        }),
      ],
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  )
}