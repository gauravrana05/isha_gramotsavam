/**
 * Isha Gramotsavam Firebase Cloud Functions
 * 
 * This file exports all Firebase Cloud Functions for the tournament management system.
 * Functions are organized by module for better maintainability.
 */

import {setGlobalOptions} from "firebase-functions/v2/options";

// Set global options for all functions
setGlobalOptions({ 
  maxInstances: 10,
});

// Export Role Management Functions
export {
  assignEventRole,
  promoteToPlayer,
  promoteToTeamCaptain,
  getCurrentEventRole,
  expireEventRoles,
  onPlayerAdded,
  onTeamCreated
} from "./roles";

// Export Team Management Functions
export {
  createTeamWithCompleteSchema,
  addPlayerToTeam,
  submitTeamForVerificationEnhanced
} from "./teams";

// Export Storage Functions
export {
  processAadhaarImageUpload,
  processProfilePhotoUpload,
  generateMediaThumbnail
} from "./storage";

// Export Verification Functions
export {
  verifyTeam,
  verifyPlayer,
  getTeamsPendingVerification,
  getTeamForVerification
} from "./verification";

// Export User Management Functions
export {
  createUserProfile,
} from "./users";

// Export Player Management Functions
export {
  validatePlayerEligibility,
  transferPlayerBetweenTeams,
  removePlayerFromTeam,
  getPlayerTeams
} from "./playerManagement";
