import { createTRPCRouter } from './trpc'
import { usersRouter } from './routers/users'
import { profileRouter } from './routers/profile'
import { teamsRouter } from './routers/teams'
import { venuesRouter } from './routers/venues'
import { tournamentsRouter } from './routers/tournaments'
import { sportsRouter } from './routers/sports'
import { volunteersRouter } from './routers/volunteers'
import { adminRouter } from './routers/admin'
import { locationRouter } from './routers/location'
import { verificationRouter } from './routers/verification'
import { postsRouter } from './routers/posts'
import { fixturesRouter } from './routers/fixtures'
import { matchesRouter } from './routers/matches'
import { notificationsRouter } from './routers/notifications'
import { chatRouter } from './routers/chat'
import { playersRouter } from './routers/players'
import { captainRouter } from './routers/captain'

// Mobile-specific routers
import { captainDashboardRouter } from './routers/sync/captainDashboard'
import { playerDashboardRouter } from './routers/sync/playerDashboard'
import { teamDataSyncRouter } from './routers/sync/teamDataSync'
import { venueDataSyncRouter } from './routers/sync/venueDataSync'
import { userNotificationsSyncRouter } from './routers/sync/userNotificationsSync'
import { venueChatRouter } from './routers/venue/chat'
import { venueMediaRouter } from './routers/venue/media'
import { mutationQueueRouter } from './routers/queue/processMutations'
import { bulkDataRouter } from './routers/bulk/initialData'
import { teamBatchOperationsRouter } from './routers/teams/batchOperations'
import { conflictResolutionRouter } from './routers/conflicts/resolve'
import { pushNotificationRouter } from './routers/notifications/push'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Existing routers
  users: usersRouter,
  profile: profileRouter,
  teams: createTRPCRouter({
    ...teamsRouter._def.procedures,
    batch: teamBatchOperationsRouter,
  }),
  venues: venuesRouter,
  tournaments: tournamentsRouter,
  sports: sportsRouter,
  volunteers: volunteersRouter,
  admin: adminRouter,
  location: locationRouter,
  verification: verificationRouter,
  posts: postsRouter,
  fixtures: fixturesRouter,
  matches: matchesRouter,
  notifications: createTRPCRouter({
    ...notificationsRouter._def.procedures,
    push: pushNotificationRouter,
  }),
  chat: chatRouter,
  players: playersRouter,
  captain: captainRouter,

  // Mobile-specific routers
  sync: createTRPCRouter({
    captainDashboard: captainDashboardRouter,
    playerDashboard: playerDashboardRouter,
    teamData: teamDataSyncRouter,
    venueData: venueDataSyncRouter,
    notifications: userNotificationsSyncRouter,
  }),
  venue: createTRPCRouter({
    chat: venueChatRouter,
    media: venueMediaRouter,
  }),
  queue: mutationQueueRouter,
  bulk: bulkDataRouter,
  conflicts: conflictResolutionRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter