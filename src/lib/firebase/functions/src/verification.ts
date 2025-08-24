import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";


// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Verify a team (approve/reject)
export const verifyTeam = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId, status, comments, verifiedBy} = data;

    if (!teamId || !status || !['approved', 'rejected'].includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid team verification data");
    }

    // Check if user has verification permissions
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Not authorized to verify teams");
    }

    // Get team data
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamData = teamDoc.data();

    // Update team verification status
    await admin.firestore().collection("teams").doc(teamId).update({
      verificationStatus: status,
      verifiedBy: verifiedBy || auth.uid,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationComments: comments || '',
      status: status === 'approved' ? 'active' : 'rejected',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update verification record
    await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("verification").doc("initial")
      .update({
        status: status,
        verifiedBy: verifiedBy || auth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        comments: comments || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Send notification to team captain
    await admin.firestore().collection("notifications").add({
      type: "team_verification_result",
      title: status === 'approved' ? "Team Approved!" : "Team Verification Required",
      message: status === 'approved' 
        ? `Your team "${teamData?.name}" has been approved and is now active.`
        : `Your team "${teamData?.name}" requires attention. Please check the comments and resubmit.`,
      teamId: teamId,
      targetUsers: [teamData?.captainId],
      data: {
        teamName: teamData?.name,
        status: status,
        comments: comments || '',
        verifiedBy: verifiedBy || auth.uid
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    // Console log removed

    return {
      success: true,
      message: `Team ${status} successfully`
    };

  } catch (error) {
    // Error handling removed
    throw new HttpsError("internal", "Failed to verify team");
  }
});

// Verify individual player
export const verifyPlayer = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId, playerId, status, comments} = data;

    if (!teamId || !playerId || !status || !['approved', 'rejected'].includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid player verification data");
    }

    // Check if user has verification permissions
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Not authorized to verify players");
    }

    // Update player verification status
    await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .update({
        verificationStatus: status,
        verifiedBy: auth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationComments: comments || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update team verification record
    await updateTeamVerificationRecord(teamId);

    // Console log removed

    return {
      success: true,
      message: `Player ${status} successfully`
    };

  } catch (error) {
    // Error handling removed
    throw new HttpsError("internal", "Failed to verify player");
  }
});

// Get teams pending verification
export const getTeamsPendingVerification = onCall( { region: "us-central1" },async (request: CallableRequest) => {
  const {auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    // Check if user has verification permissions
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Not authorized to view verification queue");
    }

    // Get teams with submitted status
    const teamsQuery = await admin.firestore()
      .collection("teams")
      .where("status", "==", "submitted")
      .orderBy("submittedAt", "desc")
      .limit(50)
      .get();

    const teams = teamsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      teams: teams
    };

  } catch (error) {
    // Error handling removed
    throw new HttpsError("internal", "Failed to get verification queue");
  }
});

// Get team details for verification
export const getTeamForVerification = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId} = data;

    if (!teamId) {
      throw new HttpsError("invalid-argument", "Team ID is required");
    }

    // Check if user has verification permissions
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Not authorized to view team details");
    }

    // Get team data
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    // Get team players
    const playersQuery = await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players")
      .get();

    const players = playersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get verification record
    const verificationDoc = await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("verification").doc("initial")
      .get();

    const verification = verificationDoc.exists ? verificationDoc.data() : null;

    return {
      success: true,
      team: {
        id: teamDoc.id,
        ...teamDoc.data()
      },
      players: players,
      verification: verification
    };

  } catch (error) {
    // Error handling removed
    throw new HttpsError("internal", "Failed to get team details");
  }
});

// Helper function to update team verification record
async function updateTeamVerificationRecord(teamId: string): Promise<void> {
  const playersSnapshot = await admin.firestore()
    .collection("teams").doc(teamId)
    .collection("players").get();

  const totalPlayers = playersSnapshot.size;
  const verifiedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "approved"
  ).length;
  const rejectedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "rejected"
  ).length;
  const pendingPlayers = totalPlayers - verifiedPlayers - rejectedPlayers;

  const allChecksComplete = pendingPlayers === 0 && rejectedPlayers === 0;

  await admin.firestore()
    .collection("teams").doc(teamId)
    .collection("verification").doc("initial")
    .update({
      playersTotal: totalPlayers,
      playersVerified: verifiedPlayers,
      playersRejected: rejectedPlayers,
      playersPending: pendingPlayers,
      'checks.allChecksComplete': allChecksComplete,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  // If all players are verified, update team status
  if (allChecksComplete && verifiedPlayers === totalPlayers) {
    await admin.firestore().collection("teams").doc(teamId).update({
      status: "verified",
      verificationStatus: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}