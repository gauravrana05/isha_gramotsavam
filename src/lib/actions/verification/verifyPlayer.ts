'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface VerifyPlayerRequest {
  teamId: string;
  playerId: string;
  status: 'verified' | 'rejected';
  comments?: string;
  volunteerId: string; // The volunteer performing the verification
}

async function updateTeamVerificationRecord(teamId: string): Promise<void> {
  const playersSnapshot = await adminDb
    .collection("teams").doc(teamId)
    .collection("players")
    .where("isDeleted", "!=", true)
    .get();

  const totalPlayers = playersSnapshot.size;
  const verifiedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "verified"
  ).length;
  const rejectedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "rejected"
  ).length;
  const pendingPlayers = totalPlayers - verifiedPlayers - rejectedPlayers;

  const allChecksComplete = pendingPlayers === 0 && rejectedPlayers === 0;

  await adminDb
    .collection("teams").doc(teamId)
    .collection("verification").doc("initial")
    .update({
      playersTotal: totalPlayers,
      playersVerified: verifiedPlayers,
      playersRejected: rejectedPlayers,
      playersPending: pendingPlayers,
      'checks.allChecksComplete': allChecksComplete,
      updatedAt: FieldValue.serverTimestamp()
    });

  // If all players are verified, update team status
  if (allChecksComplete && verifiedPlayers === totalPlayers) {
    await adminDb.collection("teams").doc(teamId).update({
      status: "verified",
      verificationStatus: "verified",
      updatedAt: FieldValue.serverTimestamp()
    });
  }
}

export async function verifyPlayer(request: VerifyPlayerRequest) {
  try {
    const { teamId, playerId, status, comments, volunteerId } = request;

    if (!teamId || !playerId || !status || !['verified', 'rejected'].includes(status)) {
      return { success: false, error: "Invalid player verification data" };
    }

    // Check if user has verification permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "Volunteer not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to verify players" };
    }

    // Check if player exists
    const playerDoc = await adminDb
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .get();

    if (!playerDoc.exists) {
      return { success: false, error: "Player not found" };
    }

    // Update player verification status
    await adminDb
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .update({
        verificationStatus: status,
        verifiedBy: volunteerId,
        verifiedAt: FieldValue.serverTimestamp(),
        verificationComments: comments || '',
        updatedAt: FieldValue.serverTimestamp()
      });

    // Update team verification record
    await updateTeamVerificationRecord(teamId);

    console.log(`Player ${playerId} in team ${teamId} ${status} by ${volunteerId}`);

    return {
      success: true,
      message: `Player ${status} successfully`
    };

  } catch (error) {
    console.error("Error verifying player:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to verify player"
    };
  }
}