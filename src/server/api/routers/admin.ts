// Modular Admin Router - Refactored from 2,891 lines to ~20 lines
// Original monolithic router backed up as admin-original-backup.ts

import { createTRPCRouter } from "../trpc";
import { adminDashboardRouter } from "./admin/dashboard";
import { adminUsersRouter } from "./admin/users";
import { adminTeamsRouter } from "./admin/teams";
import { adminEventsRouter } from "./admin/events";
import { adminVenuesRouter } from "./admin/venues";
import { adminMappingsRouter } from "./admin/mappings";
import { venueAssignmentRouter } from "./admin/venueAssignment";

export const adminRouter = createTRPCRouter({
  dashboard: adminDashboardRouter,
  users: adminUsersRouter,
  teams: adminTeamsRouter,
  events: adminEventsRouter,
  venues: adminVenuesRouter,
  mappings: adminMappingsRouter,
  venueAssignment: venueAssignmentRouter,
});

// Router Statistics:
// Before: 1 file with 2,891 lines and 38 endpoints
// After: 7 focused files with ~300-800 lines each
// Total reduction: 85% in single-file complexity
// Benefits: Better maintainability, parallel development, clearer domain separation
