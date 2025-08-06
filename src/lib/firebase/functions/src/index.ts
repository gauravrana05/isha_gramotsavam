/**
 * Isha Gramotsavam Firebase Cloud Functions
 * 
 * Essential functions that require Firebase triggers or special privileges.
 * Most business logic has been moved to server actions for better performance.
 */

import {setGlobalOptions} from "firebase-functions/v2/options";

// Set global options for all functions
setGlobalOptions({ 
  maxInstances: 20,
  region: "us-central1",
});
//testing
// Export Role Management Functions (keep - complex role system)
export {
  assignEventRole,
  promoteToPlayer,
  promoteToTeamCaptain,
  getCurrentEventRole,
  expireEventRoles,
  onPlayerAdded,
  onTeamCreated
} from "./roles";

// Export User Management Functions (keep - auth triggers)
export {
  createUserProfile,
  createPlayerUser
} from "./users";

// Note: The following functions have been replaced with server actions for better performance:
// - Team management: see /lib/actions/teams/teamManagement.ts
// - Verification: see /lib/actions/verification/verificationActions.ts  
// - Player management: see /lib/actions/players/playerManagement.ts
