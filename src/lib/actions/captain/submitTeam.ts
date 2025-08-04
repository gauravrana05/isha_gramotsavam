'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assignTeamToVenue } from '@/lib/actions/admin/teamVenueAssignment';

interface SubmitTeamRequest {
  teamId: string;
  captainId: string;
  validation: {
    playerCount: number;
    requiredPlayers: number;
    documentsComplete: boolean;
    sportGenderCategory: string;
  };
}

interface Player {
  playerId: string;
  userId: string;
  name: string;
  phone: string;
  gender: 'M' | 'F';
  position: 'main' | 'substitute';
  isDeleted?: boolean;
  isProfileComplete: boolean;
  verificationStatus?: string;
  [key: string]: any; // fallback for other props
}

async function validateTeamForSubmission(teamId: string, captainId: string): Promise<any> {
  const teamDoc = await adminDb.collection("teams").doc(teamId).get();
  
  if (!teamDoc.exists) {
    throw new Error("Team not found");
  }

  const team = teamDoc.data();
  
  if (team?.captainId !== captainId) {
    throw new Error("Not authorized to submit this team");
  }

  // Get sport configuration to determine required player count
  let minPlayersRequired = team.maxPlayers; // fallback to maxPlayers
  let sportName = team.sportName || 'Unknown';

  try {
    if (team.sportId) {
      const sportDoc = await adminDb.collection('sports').doc(team.sportId).get();
      if (sportDoc.exists) {
        const sportData = sportDoc.data();
        minPlayersRequired = sportData?.teamConfig?.minPlayers || team.maxPlayers;
        sportName = sportData?.displayName || sportData?.name || sportName;
      }
    }
  } catch (error) {
    console.warn('Could not load sport configuration, using team maxPlayers as minimum:', error);
  }

  // Check if team has minimum required players
  // Note: isDeleted field may not exist on older player documents
  // Firestore != queries exclude docs without the field, so we get all and filter manually
  const playersSnapshot = await adminDb
    .collection("teams").doc(teamId)
    .collection("players")
    .get();

  const allPlayers: Player[] = playersSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      playerId: data.playerId || doc.id,
      userId: data.userId || doc.id,
      name: data.name || '',
      phone: data.phone || '',
      gender: data.gender || 'M',
      position: data.position || 'main',
      isDeleted: data.isDeleted || false,
      isProfileComplete: data.isProfileComplete || false,
      verificationStatus: data.verificationStatus || 'pending',
      ...data
    };
  });
  
  // Filter out deleted players
  const activePlayers = allPlayers.filter(p => p.isDeleted !== true);
  const mainPlayers = activePlayers.filter(p => p.position === 'main');
  const substitutePlayers = activePlayers.filter(p => p.position === 'substitute');

  // Validate minimum main players
  if (mainPlayers.length < minPlayersRequired) {
    throw new Error(`${sportName} requires at least ${minPlayersRequired} main players. Currently have ${mainPlayers.length} main players. Please add ${minPlayersRequired - mainPlayers.length} more main players before submitting.`);
  }

  // Validate all players have valid user IDs
  const playersWithInvalidIds = activePlayers.filter(player => !player.userId);
  if (playersWithInvalidIds.length > 0) {
    const invalidPlayerNames = playersWithInvalidIds.map(p => p.name).join(', ');
    throw new Error(`${playersWithInvalidIds.length} player(s) have invalid user IDs: ${invalidPlayerNames}. Please remove and re-add these players.`);
  }

  // Validate all players have complete profiles
  const playersWithIncompleteProfiles = activePlayers.filter(player => !player.isProfileComplete);
  if (playersWithIncompleteProfiles.length > 0) {
    const incompletePlayerNames = playersWithIncompleteProfiles.map(p => p.name).join(', ');
    throw new Error(`${playersWithIncompleteProfiles.length} player(s) have incomplete profiles: ${incompletePlayerNames}. Please ensure all documents and profile information are complete.`);
  }

  return { team, players: activePlayers };
}

export async function submitTeamForVerification(request: SubmitTeamRequest) {
  try {
    const { teamId, captainId } = request;
    
    // Validate team completeness
    const { team, players } = await validateTeamForSubmission(teamId, captainId);
    
    // Update team status to submitted
    await adminDb.collection("teams").doc(teamId).update({
      status: "submitted",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Create notification for verification volunteers
    await adminDb.collection("notifications").add({
      type: "team_submitted_for_verification",
      title: "New Team Submitted for Verification",
      message: `Team "${team.name}" (${team.sportName}) has been submitted for verification`,
      teamId: teamId,
      targetRoles: ["verification_volunteer", "admin"],
      data: {
        teamName: team.name,
        sportName: team.sportName,
        captainName: team.captainProfile?.name || '',
        playerCount: players.length,
        panchayat: team.panchayat,
        district: team.district,
        genderCategory: team.genderCategory || 'mixed'
      },
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });

    // Send confirmation to captain
    await adminDb.collection("notifications").add({
      type: "team_submission_confirmation",
      title: "Team Submitted Successfully",
      message: `Your team "${team.name}" has been submitted for verification. You will be notified once the review is complete.`,
      teamId: teamId,
      targetUsers: [captainId],
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });

    console.log(`Team ${teamId} submitted for verification successfully`);

    return {
      success: true,
      teamId: teamId,
      message: "Team submitted for verification successfully"
    };
  } catch (error) {
    console.error("Error submitting team for verification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to submit team for verification"
    };
  }
}