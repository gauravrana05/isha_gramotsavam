import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";


// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Check if player can join a team (validates one-player-per-event rule)
export const validatePlayerEligibility = onCall({ region: "us-central1" }, async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {playerData, eventId} = data;

    if (!playerData || !eventId) {
      throw new HttpsError("invalid-argument", "Missing player data or event ID");
    }

    // Check by phone number
    const phoneCheck = await checkPlayerExistsInEvent(playerData.phone, eventId, 'phone');
    if (phoneCheck.exists) {
      return {
        success: false,
        eligible: false,
        reason: `Player with phone ${playerData.phone} is already registered in team "${phoneCheck.teamName}" for this event.`,
        existingTeamId: phoneCheck.teamId,
        existingTeamName: phoneCheck.teamName
      };
    }

    // Check by userId if available
    if (playerData.userId) {
      const userIdCheck = await checkPlayerExistsInEvent(playerData.userId, eventId, 'userId');
      if (userIdCheck.exists) {
        return {
          success: false,
          eligible: false,
          reason: `Player is already registered in team "${userIdCheck.teamName}" for this event.`,
          existingTeamId: userIdCheck.teamId,
          existingTeamName: userIdCheck.teamName
        };
      }
    }

    return {
      success: true,
      eligible: true,
      reason: "Player is eligible to join a team for this event"
    };

  } catch (error) {
    console.error("Error validating player eligibility:", error);
    throw new HttpsError("internal", "Failed to validate player eligibility");
  }
});

// Transfer player from one team to another (admin only)
export const transferPlayerBetweenTeams = onCall({ region: "us-central1" },async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {playerId, fromTeamId, toTeamId, reason} = data;

    if (!playerId || !fromTeamId || !toTeamId) {
      throw new HttpsError("invalid-argument", "Missing required transfer data");
    }

    // Check if user is admin
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      throw new HttpsError("permission-denied", "Only admins can transfer players between teams");
    }

    // Get player data from source team
    const playerDoc = await admin.firestore()
      .collection("teams").doc(fromTeamId)
      .collection("players").doc(playerId)
      .get();

    if (!playerDoc.exists) {
      throw new HttpsError("not-found", "Player not found in source team");
    }

    const playerData = playerDoc.data();

    // Check if destination team has capacity
    const toTeamDoc = await admin.firestore().collection("teams").doc(toTeamId).get();
    if (!toTeamDoc.exists) {
      throw new HttpsError("not-found", "Destination team not found");
    }

    const toTeamData = toTeamDoc.data();
    if (!toTeamData) {
      throw new HttpsError("internal", "Destination team data is undefined");
    }
    if (toTeamData.currentPlayers >= toTeamData.maxPlayers) {
      throw new HttpsError("invalid-argument", "Destination team is at maximum capacity");
    }

    // Perform the transfer in a batch
    const batch = admin.firestore().batch();

    // Remove from source team
    batch.delete(admin.firestore()
      .collection("teams").doc(fromTeamId)
      .collection("players").doc(playerId));

    // Add to destination team
    batch.set(admin.firestore()
      .collection("teams").doc(toTeamId)
      .collection("players").doc(playerId), {
      ...playerData,
      teamId: toTeamId,
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredBy: auth.uid,
      transferReason: reason || "Admin transfer"
    });

    // Update team player counts
    batch.update(admin.firestore().collection("teams").doc(fromTeamId), {
      currentPlayers: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    batch.update(admin.firestore().collection("teams").doc(toTeamId), {
      currentPlayers: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Log the transfer
    await admin.firestore().collection("auditLog").add({
      action: "player_transferred",
      playerId: playerId,
      fromTeamId: fromTeamId,
      toTeamId: toTeamId,
      transferredBy: auth.uid,
      reason: reason || "Admin transfer",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      playerData: {
        name: playerData!.name,
        phone: playerData!.phone,
        userId: playerData!.userId
      }
    });

    console.log(`Player ${playerId} transferred from team ${fromTeamId} to team ${toTeamId} by ${auth.uid}`);

    return {
      success: true,
      message: "Player transferred successfully"
    };

  } catch (error) {
    console.error("Error transferring player:", error);
    throw new HttpsError("internal", "Failed to transfer player");
  }
});

// Remove player from team
export const removePlayerFromTeam = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId, playerId, reason} = data;

    if (!teamId || !playerId) {
      throw new HttpsError("invalid-argument", "Missing team ID or player ID");
    }

    // Check permissions - team captains can remove from their team, admins can remove from any team
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamData = teamDoc.data();
    if (!teamData) {
      throw new HttpsError("internal", "Team Dßata is undefined");
    }
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    const isTeamCaptain = teamData.captainId === auth.uid;
    const isAdmin = userData?.role === 'admin';

    if (!isTeamCaptain && !isAdmin) {
      throw new HttpsError("permission-denied", "Only team captains or admins can remove players");
    }

    // Don't allow removing the captain
    if (playerId === teamData.captainId) {
      throw new HttpsError("invalid-argument", "Cannot remove team captain. Transfer captaincy first.");
    }

    // Get player data before removal
    const playerDoc = await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .get();

    if (!playerDoc.exists) {
      throw new HttpsError("not-found", "Player not found in team");
    }

    const playerData = playerDoc.data();

    // Remove player and update team count
    const batch = admin.firestore().batch();

    batch.delete(admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId));

    batch.update(admin.firestore().collection("teams").doc(teamId), {
      currentPlayers: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Log the removal
    await admin.firestore().collection("auditLog").add({
      action: "player_removed",
      playerId: playerId,
      teamId: teamId,
      removedBy: auth.uid,
      reason: reason || "Player removed from team",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      playerData: {
        name: playerData!.name,
        phone: playerData!.phone,
        userId: playerData!.userId
      }
    });

    console.log(`Player ${playerId} removed from team ${teamId} by ${auth.uid}`);

    return {
      success: true,
      message: "Player removed successfully"
    };

  } catch (error) {
    console.error("Error removing player:", error);
    throw new HttpsError("internal", "Failed to remove player");
  }
});

// Get all teams a player is part of (for detecting violations)
export const getPlayerTeams = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {playerIdentifier, identifierType, eventId} = data;

    if (!playerIdentifier || !identifierType || !eventId) {
      throw new HttpsError("invalid-argument", "Missing required parameters");
    }

    // Check if user is admin or verification volunteer
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || !['admin', 'verification_volunteer'].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Only admins or verification volunteers can view player teams");
    }

    const teams = [];
    
    // Query all teams in the event
    const teamsQuery = await admin.firestore()
      .collection("teams")
      .where("eventId", "==", eventId)
      .get();

    for (const teamDoc of teamsQuery.docs) {
      // Check players in each team
      const playersQuery = await admin.firestore()
        .collection("teams").doc(teamDoc.id)
        .collection("players")
        .where(identifierType, "==", playerIdentifier)
        .get();

      if (!playersQuery.empty) {
        const teamData = teamDoc.data();
        const playerData = playersQuery.docs[0].data();
        
        teams.push({
          teamId: teamDoc.id,
          teamName: teamData.name,
          teamStatus: teamData.status,
          captainName: teamData.captainProfile?.name,
          panchayat: teamData.panchayat,
          playerData: {
            playerId: playersQuery.docs[0].id,
            name: playerData.name,
            phone: playerData.phone,
            userId: playerData.userId,
            addedAt: playerData.addedAt,
            verificationStatus: playerData.verificationStatus
          }
        });
      }
    }

    return {
      success: true,
      teams: teams,
      violatesRule: teams.length > 1,
      message: teams.length > 1 
        ? `Player is in ${teams.length} teams, violating the one-player-per-event rule`
        : `Player is in ${teams.length} team(s), complying with rules`
    };

  } catch (error) {
    console.error("Error getting player teams:", error);
    throw new HttpsError("internal", "Failed to get player teams");
  }
});

// Helper function (reused from teams.ts)
async function checkPlayerExistsInEvent(playerIdentifier: string, eventId: string, identifierType: 'userId' | 'phone'): Promise<{ exists: boolean, teamId?: string, teamName?: string }> {
  try {
    // Query all teams in the event
    const teamsQuery = await admin.firestore()
      .collection("teams")
      .where("eventId", "==", eventId)
      .get();

    for (const teamDoc of teamsQuery.docs) {
      // Check players in each team
      const playersQuery = await admin.firestore()
        .collection("teams").doc(teamDoc.id)
        .collection("players")
        .where(identifierType, "==", playerIdentifier)
        .get();

      if (!playersQuery.empty) {
        const teamData = teamDoc.data();
        return {
          exists: true,
          teamId: teamDoc.id,
          teamName: teamData.name
        };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking player existence in event:", error);
    return { exists: false };
  }
}