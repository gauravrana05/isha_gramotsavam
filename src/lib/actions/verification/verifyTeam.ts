'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface VerifyTeamRequest {
  teamId: string;
  status: 'verified' | 'rejected';
  comments?: string;
  verifiedBy: string;
  volunteerId: string; // The volunteer performing the verification
}

export async function updateTeamVerificationRecord(teamId: string): Promise<void> {
  const playersSnapshot = await adminDb
    .collection("teams").doc(teamId)
    .collection("players")
    .where("isDeleted", "!=", true)
    .get();

  const totalPlayers = playersSnapshot.size;
  const verifiedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "approved"
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

  // If all players are approved, update team status to verified
  if (allChecksComplete && verifiedPlayers === totalPlayers) {
    await adminDb.collection("teams").doc(teamId).update({
      status: "verified",
      verificationStatus: "verified",
      updatedAt: FieldValue.serverTimestamp()
    });

    // Venue assignment is now handled during team creation, not verification
  }
}

export async function verifyTeam(request: VerifyTeamRequest) {
  try {
    const { teamId, status, comments, verifiedBy, volunteerId } = request;

    if (!teamId || !status || !['verified', 'rejected'].includes(status)) {
      return { success: false, error: "Invalid team verification data" };
    }

    // Check if user has verification permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "Volunteer not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to verify teams" };
    }

    // Get team data
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }

    const teamData = teamDoc.data();

    // Update team verification status
    const updateData: any = {
      verificationStatus: status,
      verifiedBy: verifiedBy || volunteerId,
      verifiedAt: FieldValue.serverTimestamp(),
      verificationComments: comments || '',
      status: status === 'verified' ? 'verified' : 'rejected',
      updatedAt: FieldValue.serverTimestamp()
    };

    await adminDb.collection("teams").doc(teamId).update(updateData);

    // Update verification record
    await adminDb
      .collection("teams").doc(teamId)
      .collection("verification").doc("initial")
      .update({
        status: status,
        verifiedBy: verifiedBy || volunteerId,
        verifiedAt: FieldValue.serverTimestamp(),
        comments: comments || '',
        updatedAt: FieldValue.serverTimestamp()
      });

    // Venue assignment is now handled during team creation, not verification

    // Send notification to team captain
    await adminDb.collection("notifications").add({
      type: "team_verification_result",
      title: status === 'verified' ? "Team Approved!" : "Team Verification Required",
      message: status === 'verified' 
        ? `Your team "${teamData?.name}" has been approved and is now active.`
        : `Your team "${teamData?.name}" requires attention. Please check the comments and resubmit.`,
      teamId: teamId,
      targetUsers: [teamData?.captainId],
      data: {
        teamName: teamData?.name,
        status: status,
        comments: comments || '',
        verifiedBy: verifiedBy || volunteerId
      },
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });

    return {
      success: true,
      message: `Team ${status} successfully`
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to verify team"
    };
  }
}