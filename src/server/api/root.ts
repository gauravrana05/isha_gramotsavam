import { createTRPCRouter } from './trpc'
import { usersRouter } from './routers/users'
import { profileRouter } from './routers/profile'
import { teamsRouter } from './routers/teams'
import { venuesRouter } from './routers/venues'
import { tournamentsRouter } from './routers/tournaments'
import { sportsRouter } from './routers/sports'
import { playersRouter } from './routers/players'
import { volunteersRouter } from './routers/volunteers'
import { adminRouter } from './routers/admin'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  users: usersRouter,
  profile: profileRouter,
  teams: teamsRouter,
  venues: venuesRouter,
  tournaments: tournamentsRouter,
  sports: sportsRouter,
  players: playersRouter,
  volunteers: volunteersRouter,
  admin: adminRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter