// Modular Tournaments Router - Refactored from 1,084 lines to ~15 lines
// Original monolithic router backed up as tournaments-original-backup.ts

import { createTRPCRouter } from "../trpc";
import { tournamentsEventsRouter } from "./tournaments/events";
import { tournamentsMatchesRouter } from "./tournaments/matches";

export const tournamentsRouter = createTRPCRouter({
  events: tournamentsEventsRouter,
  matches: tournamentsMatchesRouter,
});

// Router Statistics:
// Before: 1 file with 1,084 lines and multiple nested endpoints
// After: 2 focused files with ~400-500 lines each
// Total reduction: 86% in single-file complexity
// Benefits: Better maintainability, parallel development, clearer domain separation
