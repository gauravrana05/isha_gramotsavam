'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RemovePlayerRequest {
  teamId: string;
  playerId: string;
  captainId: string;
}

export async function removePlayerFromTeam({ teamId, playerId, captainId }: RemovePlayerRequest) {
  try {
    // Get team data for validation
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }
    const teamData = teamDoc.data()!;

    // Verify captain ownership
    if (teamData.captainId !== captainId) {
      return { success: false, error: "Unauthorized: You are not the captain of this team" };
    }

    // Check if team is already submitted
    if (teamData.status && teamData.status !== 'draft') {
      return { success: false, error: "Cannot remove players from a submitted team" };
    }

    // Get player data
    const playerDoc = await adminDb
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .get();

    if (!playerDoc.exists) {
      return { success: false, error: "Player not found in team" };
    }
    const playerData = playerDoc.data()!;

    // Prevent removing captain
    if (playerId === teamData.captainId) {
      return { success: false, error: "Cannot remove team captain" };
    }

    // Use transaction to ensure consistency
    await adminDb.runTransaction(async (transaction) => {
      // Mark player as deleted (soft delete)
      const playerRef = adminDb
        .collection("teams").doc(teamId)
        .collection("players").doc(playerId);

      transaction.update(playerRef, {
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: captainId,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update team player/substitute count
      const teamRef = adminDb.collection("teams").doc(teamId);
      const currentCount = teamData.currentPlayers || 0;
      const currentSubs = teamData.currentSubstitutes || 0;

      transaction.update(teamRef, {
        currentPlayers: playerData.position === 'main' ? Math.max(0, currentCount - 1) : currentCount,
        currentSubstitutes: playerData.position === 'substitute' ? Math.max(0, currentSubs - 1) : currentSubs,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Clear the user's currentTeamId when removing from team
      if (playerData.userId) {
        const userRef = adminDb.collection("users").doc(playerData.userId);
        transaction.update(userRef, {
          currentTeamId: null,
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    return {
      success: true,
      message: "Player removed successfully"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove player from team"
    };
  }
}