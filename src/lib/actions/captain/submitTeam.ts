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
        minPlayersRequired = sportData.teamConfig?.minPlayers || team.maxPlayers;
        sportName = sportData.displayName || sportData.name || sportName;
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

  const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter out deleted players manually (handles missing isDeleted field)
  const players = allPlayers.filter(p => p.isDeleted !== true);
  const mainPlayers = players.filter(p => p.position === 'main').length;

  if (mainPlayers < minPlayersRequired) {
    throw new Error(`${sportName} requires at least ${minPlayersRequired} main players. Currently have ${mainPlayers} main players. Please add ${minPlayersRequired - mainPlayers} more main players before submitting.`);
  }

  // Check if all players have complete documents
  const playersWithIncompleteDocuments = players.filter(player => {
    const docs = player.documents || {};
    const hasProfilePhoto = docs.profilePhoto?.url;
    const hasAadhaarFront = docs.aadhaarFront?.url;
    const hasAadhaarBack = docs.aadhaarBack?.url;
    
    const isComplete = hasProfilePhoto && hasAadhaarFront && hasAadhaarBack;
    
    
    return !isComplete;
  });

  if (playersWithIncompleteDocuments.length > 0) {
    const missingPlayerNames = playersWithIncompleteDocuments.map(p => p.name).join(', ');
    throw new Error(`${playersWithIncompleteDocuments.length} player(s) have incomplete documents: ${missingPlayerNames}. Please ensure all documents are uploaded.`);
  }

  // Validate gender requirements for sport
  if (team.sportName === 'Throwball') {
    const malePlayersCount = players.filter(p => p.gender === 'M').length;
    if (malePlayersCount > 0) {
      throw new Error(`Throwball is only for women. Found ${malePlayersCount} male player(s).`);
    }
  }

  return { team, players };
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