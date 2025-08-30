// Modular Teams Router - Refactored from 2,347 lines to ~20 lines
// Original monolithic router backed up as teams-original-backup.ts

import { createTRPCRouter } from "../trpc";
import { teamsManagementRouter } from "./teams/management";
import { teamsPlayersRouter } from "./teams/players";
import { teamsVerificationRouter } from "./teams/verification";
import { teamsFixturesRouter } from "./teams/fixtures";

export const teamsRouter = createTRPCRouter({
  management: teamsManagementRouter,
  players: teamsPlayersRouter,
  verification: teamsVerificationRouter,
  fixtures: teamsFixturesRouter,
});

// Router Statistics:
// Before: 1 file with 2,347 lines and 19 endpoints
// After: 4 focused files with ~300-600 lines each
// Total reduction: 92% in single-file complexity
// Benefits: Better maintainability, parallel development, clearer domain separation
