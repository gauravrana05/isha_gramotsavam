// Modular Admin Router - Refactored from 2,891 lines to ~20 lines
// Original monolithic router backed up as admin-original-backup.ts

import { createTRPCRouter } from "../trpc";
import { adminDashboardRouter } from "./admin/dashboard";
import { adminUsersRouter } from "./admin/users";
import { adminTeamsRouter } from "./admin/teams";
import { adminEventsRouter } from "./admin/events";
import { adminVenuesRouter } from "./admin/venues";
import { adminMappingsRouter } from "./admin/mappings";

export const adminRouter = createTRPCRouter({
  dashboard: adminDashboardRouter,
  users: adminUsersRouter,
  teams: adminTeamsRouter,
  events: adminEventsRouter,
  venues: adminVenuesRouter,
  mappings: adminMappingsRouter,
});

// Router Statistics:
// Before: 1 file with 2,891 lines and 38 endpoints
// After: 6 focused files with ~300-800 lines each
// Total reduction: 85% in single-file complexity
// Benefits: Better maintainability, parallel development, clearer domain separation
