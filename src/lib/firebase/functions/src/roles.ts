import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {onDocumentCreated, FirestoreEvent, DocumentSnapshot} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";


// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export interface EventRole {
  roleId: string;
  userId: string;
  role: 'public' | 'player' | 'captain' | 'verification_volunteer' | 'admin';
  eventId: string;
  eventName: string;
  teamId?: string;
  roleStartDate: admin.firestore.Timestamp;
  roleEndDate: admin.firestore.Timestamp;
  isActive: boolean;
  autoExpire: boolean;
  assignedBy: string;
  assignedAt: admin.firestore.Timestamp;
  permissions: string[];
  metadata?: { [key: string]: any };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Assign event-based role to user
export const assignEventRole = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {userId, role, eventId, teamId, assignedBy, metadata} = data;

    // Validate required fields
    if (!userId || !role || !eventId) {
      throw new HttpsError("invalid-argument", "Missing required fields: userId, role, eventId");
    }

    // Check if requester has permission to assign roles
    const requesterRole = await getCurrentUserRole(auth.uid, eventId);
    if (!canAssignRole(requesterRole, role)) {
      throw new HttpsError("permission-denied", "Insufficient permissions to assign this role");
    }

    // Set role dates based on event
    const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError("not-found", "Event not found");
    }

    const eventData = eventDoc.data();
    const roleStartDate = admin.firestore.Timestamp.now();
    const roleEndDate = eventData?.endDate || admin.firestore.Timestamp.fromDate(new Date("2025-12-31"));

    // Deactivate existing roles for this user in this event
    await deactivateUserEventRoles(userId, eventId);

    // Create new role
    const roleId = `${role}_${eventId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const roleData: EventRole = {
      roleId: roleId,
      userId: userId,
      role: role,
      eventId: eventId,
      eventName: eventData?.name || "Isha Gramotsavam 2025",
      teamId: teamId || undefined,
      roleStartDate: roleStartDate,
      roleEndDate: roleEndDate,
      isActive: true,
      autoExpire: true,
      assignedBy: assignedBy || auth.uid,
      assignedAt: admin.firestore.Timestamp.now(),
      permissions: getPermissionsForRole(role),
      metadata: metadata || {},
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Add to user's eventRoles subcollection
    await admin.firestore()
      .collection("users").doc(userId)
      .collection("eventRoles").doc(roleId)
      .set(roleData);

    // Update main user document with current role
    await admin.firestore().collection("users").doc(userId).update({
      role: role,
      currentEventRole: roleId,
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Log role assignment
    await admin.firestore().collection("auditLog").add({
      action: "role_assigned",
      userId: userId,
      role: role,
      eventId: eventId,
      teamId: teamId,
      assignedBy: auth.uid,
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        roleId: roleId,
        metadata: metadata
      }
    });

    console.log(`Role ${role} assigned to user ${userId} for event ${eventId}`);

    return {
      success: true,
      roleId: roleId,
      message: `Role ${role} assigned successfully`
    };

  } catch (error) {
    console.error("Error assigning event role:", error);
    throw new HttpsError("internal", "Failed to assign role");
  }
});

// Promote user to player when they are added to a team
export const promoteToPlayer = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {userId, teamId, eventId} = data;

    if (!userId || !teamId || !eventId) {
      throw new HttpsError("invalid-argument", "Missing userId, teamId, or eventId");
    }

    // Verify the team exists
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamData = teamDoc.data();

    // Check if the requester is the team captain or admin
    const requesterRole = await getCurrentUserRole(auth.uid, eventId);
    const isTeamCaptain = teamData?.captainId === auth.uid;
    const canPromote = isTeamCaptain || requesterRole === 'admin';

    if (!canPromote) {
      throw new HttpsError("permission-denied", "Only team captains or admins can promote players");
    }

    // If user is already captain of this team, don't demote them to player
    if (teamData?.captainId === userId) {
      return {
        success: true,
        message: "User is already team captain, no role change needed"
      };
    }

    // Assign player role
    await assignUserEventRole(
      userId,
      'player',
      eventId,
      teamId,
      auth.uid,
      {
        promotedToPlayer: true,
        teamName: teamData?.name,
        promotedBy: auth.uid
      }
    );

    console.log(`User ${userId} promoted to player for team ${teamId}`);

    return {
      success: true,
      message: "User promoted to player successfully"
    };

  } catch (error) {
    console.error("Error promoting to player:", error);
    throw new HttpsError("internal", "Failed to promote to player");
  }
});

// Promote user to captain when they create a team
export const promoteToTeamCaptain = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId, eventId} = data;

    if (!teamId || !eventId) {
      throw new HttpsError("invalid-argument", "Missing teamId or eventId");
    }

    // Verify the team exists and user is the captain
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamData = teamDoc.data();
    if (teamData?.captainId !== auth.uid) {
      throw new HttpsError("permission-denied", "User is not the captain of this team");
    }

    // Assign captain role
    await assignUserEventRole(
      auth.uid,
      'captain',
      eventId,
      teamId,
      'system',
      {
        promotedFromTeamCreation: true,
        teamName: teamData?.name
      }
    );

    return {
      success: true,
      message: "User promoted to captain successfully"
    };

  } catch (error) {
    console.error("Error promoting to team captain:", error);
    throw new HttpsError("internal", "Failed to promote to team captain");
  }
});

// Get user's current role for an event
export const getCurrentEventRole = onCall( { region: "us-central1" }, async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {userId, eventId} = data;
    const targetUserId = userId || auth.uid;

    const role = await getCurrentUserRole(targetUserId, eventId);
    
    return {
      success: true,
      role: role
    };

  } catch (error) {
    console.error("Error getting current event role:", error);
    throw new HttpsError("internal", "Failed to get current role");
  }
});

// Auto-expire roles (scheduled function would call this)
export const expireEventRoles = onCall(async (request: CallableRequest) => {
  const {auth} = request;
  
  // Only admins or system can expire roles
  if (!auth || !(await isAdmin(auth.uid))) {
    throw new HttpsError("permission-denied", "Only admins can expire roles");
  }

  try {
    const now = admin.firestore.Timestamp.now();
    
    // Find all active roles that should be expired
    const expiredRolesQuery = await admin.firestore()
      .collectionGroup("eventRoles")
      .where("isActive", "==", true)
      .where("autoExpire", "==", true)
      .where("roleEndDate", "<=", now)
      .get();

    const batch = admin.firestore().batch();
    let expiredCount = 0;

    expiredRolesQuery.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const roleData = doc.data();
      
      // Update role to inactive
      batch.update(doc.ref, {
        isActive: false,
        expiredAt: now,
        updatedAt: now
      });

      // Reset user's main role to public if this was their current role
      if (roleData.userId) {
        const userRef = admin.firestore().collection("users").doc(roleData.userId);
        batch.update(userRef, {
          role: 'public',
          currentEventRole: null,
          updatedAt: now
        });
      }

      expiredCount++;
    });

    await batch.commit();

    console.log(`Expired ${expiredCount} event roles`);

    return {
      success: true,
      expiredCount: expiredCount,
      message: `Expired ${expiredCount} roles`
    };

  } catch (error) {
    console.error("Error expiring event roles:", error);
    throw new HttpsError("internal", "Failed to expire roles");
  }
});

// Trigger when player is added to team - automatically promote to player
export const onPlayerAdded = onDocumentCreated("teams/{teamId}/players/{playerId}", async (event: FirestoreEvent<DocumentSnapshot | undefined>) => {
  const playerData = event.data?.data();
  const teamId = event.params.teamId;
  const playerId = event.params.playerId;

  if (!playerData || !playerData.userId) {
    console.log("Player data or userId missing");
    return;
  }

  try {
    // Get team data to determine event
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      console.log("Team not found for player promotion");
      return;
    }

    const teamData = teamDoc.data();
    const eventId = teamData?.eventId || "gramotsavam_2025";

    // Don't promote if user is already the team captain
    if (teamData?.captainId === playerData.userId) {
      console.log(`User ${playerData.userId} is already captain of team ${teamId}, skipping player promotion`);
      return;
    }

    // Auto-promote user to player role
    await assignUserEventRole(
      playerData.userId,
      'player',
      eventId,
      teamId,
      'system',
      {
        promotedFromPlayerAddition: true,
        teamName: teamData?.name,
        playerId: playerId,
        autoPromoted: true
      }
    );

    console.log(`Auto-promoted user ${playerData.userId} to player for team ${teamId}`);

    // If the player has a phone number but no userId (new user), we might need to handle that separately
    if (!playerData.userId && playerData.phone) {
      console.log(`Player ${playerId} added with phone ${playerData.phone} but no userId - will promote when they register`);
    }

  } catch (error) {
    console.error("Error auto-promoting player:", error);
  }
});

// Trigger when team is created - automatically promote captain
export const onTeamCreated = onDocumentCreated(
  {
    region: "us-central1",
    document: "teams/{teamId}",
  },
  async (event: FirestoreEvent<DocumentSnapshot | undefined>) => {
    const teamData = event.data?.data();
    const teamId = event.params.teamId;

    if (!teamData || !teamData.captainId) {
      console.log("Team data or captainId missing");
      return;
    }

    try {
      const eventId = teamData.eventId || "gramotsavam_2025";

      await assignUserEventRole(
        teamData.captainId,
        "captain",
        eventId,
        teamId,
        "system",
        {
          promotedFromTeamCreation: true,
          teamName: teamData.teamName,
          autoPromoted: true,
        }
      );

      console.log(
        `Auto-promoted user ${teamData.captainId} to captain for team ${teamId}`
      );
    } catch (error) {
      console.error("Error auto-promoting team captain:", error);
    }
  }
);

// Helper Functions
async function getCurrentUserRole(userId: string, eventId: string): Promise<string> {
  try {
    const activeRoleQuery = await admin.firestore()
      .collection("users").doc(userId)
      .collection("eventRoles")
      .where("eventId", "==", eventId)
      .where("isActive", "==", true)
      .orderBy("assignedAt", "desc")
      .limit(1)
      .get();

    if (activeRoleQuery.empty) {
      return 'public'; // Default role
    }

    const roleData = activeRoleQuery.docs[0].data();
    
    // Check if role has expired
    const now = admin.firestore.Timestamp.now();
    if (roleData.roleEndDate && roleData.roleEndDate.toMillis() < now.toMillis()) {
      return 'public';
    }

    return roleData.role || 'public';
  } catch (error) {
    console.error("Error getting user role:", error);
    return 'public';
  }
}

async function deactivateUserEventRoles(userId: string, eventId: string): Promise<void> {
  const activeRolesQuery = await admin.firestore()
    .collection("users").doc(userId)
    .collection("eventRoles")
    .where("eventId", "==", eventId)
    .where("isActive", "==", true)
    .get();

  const batch = admin.firestore().batch();
  
  activeRolesQuery.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    batch.update(doc.ref, {
      isActive: false,
      deactivatedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
  });

  await batch.commit();
}

async function assignUserEventRole(
  userId: string, 
  role: string, 
  eventId: string, 
  teamId: string | null,
  assignedBy: string,
  metadata: any = {}
): Promise<void> {
  // Deactivate existing roles
  await deactivateUserEventRoles(userId, eventId);

  // Get event data for role dates
  const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
  const eventData = eventDoc.exists ? eventDoc.data() : null;

  const roleId = `${role}_${eventId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  const roleData: EventRole = {
    roleId: roleId,
    userId: userId,
    role: role as any,
    eventId: eventId,
    eventName: eventData?.name || "Isha Gramotsavam 2025",
    teamId: teamId || undefined,
    roleStartDate: admin.firestore.Timestamp.now(),
    roleEndDate: eventData?.endDate || admin.firestore.Timestamp.fromDate(new Date("2025-12-31")),
    isActive: true,
    autoExpire: true,
    assignedBy: assignedBy,
    assignedAt: admin.firestore.Timestamp.now(),
    permissions: getPermissionsForRole(role),
    metadata: metadata,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };

  // Add to user's eventRoles subcollection
  await admin.firestore()
    .collection("users").doc(userId)
    .collection("eventRoles").doc(roleId)
    .set(roleData);

  // Update main user document
  await admin.firestore().collection("users").doc(userId).update({
    role: role,
    currentEventRole: roleId,
    updatedAt: admin.firestore.Timestamp.now()
  });
}

function getPermissionsForRole(role: string): string[] {
  const permissions: { [key: string]: string[] } = {
    public: ["view_public_content"],
    player: ["view_team", "update_profile", "view_matches"],
    captain: ["manage_team", "add_players", "view_team_stats", "submit_team"],
    verification_volunteer: ["verify_teams", "verify_players", "view_all_teams"],
    admin: ["manage_all", "system_config", "user_management", "assign_roles"]
  };
  
  return permissions[role] || permissions.public;
}

function canAssignRole(assignerRole: string, targetRole: string): boolean {
  const roleHierarchy: { [key: string]: string[] } = {
    admin: ["public", "player", "captain", "verification_volunteer"],
    verification_volunteer: ["public", "player"],
    captain: ["player"], // Can assign players to their team
    player: [],
    public: []
  };
  
  return roleHierarchy[assignerRole]?.includes(targetRole) || assignerRole === "admin";
}

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    return false;
  }
}