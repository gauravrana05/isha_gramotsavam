'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

interface MatchDayPlayerVerification {
  playerId: string;
  status: 'verified' | 'rejected';
  comments?: string;
  verifiedBy: string;
  verificationIssues?: string[];
}

interface MatchDayTeamData {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  matchDayStatus?: 'pending' | 'verified' | 'checked_in';
  clusterVenue?: string;
  teamImageUrl?: string;
}

interface MatchDayPlayerData {
  id: string;
  playerId: string;
  userId: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  profileComplete: boolean;
  documents: {
    profilePhoto: { url?: string | null; verified: boolean };
    aadhaarFront: { url?: string | null; verified: boolean };
    aadhaarBack: { url?: string | null; verified: boolean };
  };
  verificationStatus: string;
  matchDayVerificationStatus?: 'pending' | 'verified' | 'rejected';
  matchDayVerifiedBy?: string;
  matchDayVerifiedAt?: any;
  matchDayComments?: string;
}

export async function getVenueTeamsForMatchDay(venueId: string, volunteerId: string) {
  try {
    // Check if user has technical volunteer permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to perform match day verification" };
    }

    // Get teams assigned to this venue
    const teamVenueQuery = await adminDb
      .collection('teamVenueAssignment')
      .where('venueId', '==', venueId)
      .where('eventId', '==', 'isha_gramotsavam_2025')
      .get();

    const teams: MatchDayTeamData[] = [];

    for (const assignmentDoc of teamVenueQuery.docs) {
      const assignment = assignmentDoc.data();
      const teamDoc = await adminDb.collection('teams').doc(assignment.teamId).get();

      if (teamDoc.exists) {
        const teamData = teamDoc.data();

        // Get players count and match day verification status
        const playersSnapshot = await adminDb
          .collection('teams').doc(assignment.teamId)
          .collection('players')
          .get();

        // Filter out deleted players manually and count verified players
        const activePlayers = playersSnapshot.docs.filter(doc => doc.data().isDeleted !== true);
        const verifiedPlayersCount = activePlayers.filter(doc => 
          doc.data().matchDayVerificationStatus === 'verified'
        ).length;

        teams.push({
          id: assignment.teamId,
          name: teamData.name,
          sportName: teamData.sportName,
          captainProfile: teamData.captainProfile,
          panchayat: teamData.panchayat,
          district: teamData.district,
          currentPlayers: activePlayers.length,
          maxPlayers: teamData.maxPlayers,
          status: teamData.status,
          matchDayStatus: teamData.matchDayStatus || 'pending',
          clusterVenue: teamData.clusterVenue,
          teamImageUrl: teamData.teamImageUrl
        });
      }
    }

    return {
      success: true,
      teams: teams
    };

  } catch (error) {
    console.error("Error getting venue teams for match day:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get venue teams"
    };
  }
}

export async function getTeamForMatchDayVerification(teamId: string, volunteerId: string) {
  try {
    // Check if user has technical volunteer permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to perform match day verification" };
    }

    // Get team data
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }

    const teamData = teamDoc.data();

    // Get team players (excluding deleted players)
    // Note: Using get() without filter as isDeleted field may not exist on older documents
    // Firestore != queries exclude docs without the field, so we filter manually after
    const playersQuery = await adminDb
      .collection("teams").doc(teamId)
      .collection("players")
      .get();

    const players: MatchDayPlayerData[] = [];

    for (const playerDoc of playersQuery.docs) {
      const playerData = playerDoc.data();
      
      // Skip deleted players (manual filtering to handle missing isDeleted field)
      if (playerData.isDeleted === true) {
        continue;
      }

      // Get fresh document data from users collection if available
      let userDocuments = playerData.documents;
      if (playerData.userId && !playerData.userId.startsWith('user_')) {
        try {
          const userDocRef = adminDb.collection("users").doc(playerData.userId);
          const userDoc = await userDocRef.get();
          if (userDoc.exists()) {
            const freshUserData = userDoc.data();
            if (freshUserData?.documents) {
              userDocuments = freshUserData.documents;
            }
          }
        } catch (error) {
          console.warn(`Could not load fresh documents for player ${playerData.userId}:`, error);
        }
      }

      players.push({
        id: playerDoc.id,
        playerId: playerDoc.id,
        userId: playerData.userId || '',
        name: playerData.name || '',
        phone: playerData.phone || '',
        age: playerData.age || 0,
        gender: playerData.gender || 'M',
        position: playerData.position || 'main',
        profileComplete: playerData.profileComplete || false,
        documents: {
          profilePhoto: {
            url: userDocuments?.profilePhoto?.url || null,
            verified: userDocuments?.profilePhoto?.verified || false
          },
          aadhaarFront: {
            url: userDocuments?.aadhaarFront?.url || null,
            verified: userDocuments?.aadhaarFront?.verified || false
          },
          aadhaarBack: {
            url: userDocuments?.aadhaarBack?.url || null,
            verified: userDocuments?.aadhaarBack?.verified || false
          }
        },
        verificationStatus: playerData.verificationStatus || 'pending',
        matchDayVerificationStatus: playerData.matchDayVerificationStatus || 'pending',
        matchDayVerifiedBy: playerData.matchDayVerifiedBy,
        matchDayVerifiedAt: playerData.matchDayVerifiedAt?.toDate?.()?.toISOString() || null,
        matchDayComments: playerData.matchDayComments || ''
      });
    }

    return {
      success: true,
      team: {
        id: teamDoc.id,
        name: teamData.name,
        sportName: teamData.sportName,
        captainProfile: teamData.captainProfile,
        panchayat: teamData.panchayat,
        district: teamData.district,
        currentPlayers: teamData.currentPlayers || 0,
        maxPlayers: teamData.maxPlayers || 0,
        status: teamData.status,
        matchDayStatus: teamData.matchDayStatus || 'pending',
        teamImageUrl: teamData.teamImageUrl,
        clusterVenue: teamData.clusterVenue,
        // Convert Firestore timestamps to strings
        createdAt: teamData.createdAt?.toDate?.()?.toISOString() || null,
        submittedAt: teamData.submittedAt?.toDate?.()?.toISOString() || null,
        verifiedAt: teamData.verifiedAt?.toDate?.()?.toISOString() || null,
        updatedAt: teamData.updatedAt?.toDate?.()?.toISOString() || null
      },
      players: players
    };

  } catch (error) {
    console.error("Error getting team for match day verification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get team details"
    };
  }
}

export async function verifyPlayerMatchDay(request: MatchDayPlayerVerification & { teamId?: string; venueId?: string }) {
  try {
    const { playerId, status, comments, verifiedBy, verificationIssues, teamId, venueId } = request;

    if (!playerId || !status || !['verified', 'rejected'].includes(status)) {
      return { success: false, error: "Invalid player verification data" };
    }

    // Check if user has technical volunteer permissions
    const userDoc = await adminDb.collection("users").doc(verifiedBy).get();
    if (!userDoc.exists) {
      return { success: false, error: "Volunteer not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to verify players" };
    }

    // If teamId is provided, use direct path; otherwise find the team
    let finalTeamId = teamId;
    let playerDocRef;

    if (teamId) {
      // Direct path - more reliable
      playerDocRef = adminDb.collection('teams').doc(teamId).collection('players').doc(playerId);
      const playerDoc = await playerDocRef.get();
      if (!playerDoc.exists) {
        return { success: false, error: "Player not found in specified team" };
      }
    } else {
      // Fallback: Find the team containing this player
      const teamsQuery = await adminDb.collectionGroup('players')
        .where('playerId', '==', playerId)
        .limit(1)
        .get();

      if (teamsQuery.empty) {
        return { success: false, error: "Player not found in any team" };
      }

      const playerDoc = teamsQuery.docs[0];
      finalTeamId = playerDoc.ref.parent.parent?.id;
      playerDocRef = playerDoc.ref;

      if (!finalTeamId) {
        return { success: false, error: "Could not determine team for player" };
      }
    }

    // Update player match day verification status
    await playerDocRef.update({
      matchDayVerificationStatus: status,
      matchDayVerifiedBy: verifiedBy,
      matchDayVerifiedAt: FieldValue.serverTimestamp(),
      matchDayComments: comments || '',
      matchDayVerificationIssues: verificationIssues || [],
      updatedAt: FieldValue.serverTimestamp()
    });

    // Check if all players in the team are now verified
    const allPlayersQuery = await adminDb
      .collection('teams').doc(finalTeamId)
      .collection('players')
      .get();

    // Filter out deleted players manually and count verified players
    const activePlayers = allPlayersQuery.docs.filter(doc => doc.data().isDeleted !== true);
    const verifiedPlayers = activePlayers.filter(doc => 
      doc.data().matchDayVerificationStatus === 'verified'
    );

    const totalPlayers = activePlayers.length;
    const allPlayersVerified = verifiedPlayers.length === totalPlayers;

    // If all players are verified, auto-check in the team
    if (allPlayersVerified) {
      // Get venue from teamVenueAssignment if not provided
      let teamVenueId = venueId;
      if (!teamVenueId) {
        const venueAssignmentQuery = await adminDb
          .collection('teamVenueAssignment')
          .where('teamId', '==', finalTeamId)
          .where('eventId', '==', 'isha_gramotsavam_2025')
          .limit(1)
          .get();
        
        if (!venueAssignmentQuery.empty) {
          teamVenueId = venueAssignmentQuery.docs[0].data().venueId;
        }
      }

      // Get the team's eventId to ensure consistency
      const teamDoc = await adminDb.collection('teams').doc(finalTeamId).get();
      const teamData = teamDoc.data();
      const teamEventId = teamData?.eventId || 'isha_gramotsavam_2025';

      await adminDb.collection('teams').doc(finalTeamId).update({
        matchDayStatus: 'checked_in',
        checkedIn: true, // Also set the main checkedIn field
        checkedInVenue: teamVenueId, // Set the venue where team is checked in
        eventId: teamEventId, // Ensure eventId is set
        checkedInAt: FieldValue.serverTimestamp(),
        checkedInBy: 'auto_system',
        autoCheckedIn: true,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Revalidate relevant pages
      if (teamVenueId) {
        revalidatePath(`/volunteer/venues/${teamVenueId}`);
        revalidatePath(`/volunteer/venues/${teamVenueId}/teams`);
        revalidatePath(`/volunteer/venues/${teamVenueId}/fixtures`);
      }

      console.log(`Team ${finalTeamId} auto-checked in at venue ${teamVenueId} after all players verified`);
    }

    console.log(`Player ${playerId} match day verification ${status} by ${verifiedBy}`);

    return {
      success: true,
      message: `Player ${status} successfully`,
      allPlayersVerified: allPlayersVerified,
      teamAutoCheckedIn: allPlayersVerified
    };

  } catch (error) {
    console.error("Error verifying player for match day:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to verify player"
    };
  }
}

export async function uploadTeamImage(teamId: string, imageUrl: string, uploadedBy: string) {
  try {
    // Check if user has technical volunteer permissions
    const userDoc = await adminDb.collection("users").doc(uploadedBy).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to upload team images" };
    }

    // Update team document with image URL
    await adminDb.collection('teams').doc(teamId).update({
      teamImageUrl: imageUrl,
      teamImageUploadedBy: uploadedBy,
      teamImageUploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`Team image uploaded for team ${teamId} by ${uploadedBy}`);

    return {
      success: true,
      message: "Team image uploaded successfully"
    };

  } catch (error) {
    console.error("Error uploading team image:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload team image"
    };
  }
}