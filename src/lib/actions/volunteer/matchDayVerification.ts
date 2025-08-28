'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils/firestore';
import { auditLogService } from '@/lib/services/auditLogService';
interface MatchDayPlayerVerification {
  playerId: string;
  status: 'pending' | 'verified' | 'approved' | 'rejected';
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
  verifiedPlayersCount?: number;
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
    profilePhoto: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
    aadhaarFront: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
    aadhaarBack: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
  };
  verificationStatus: string;
  verifiedBy?: string;
  verifiedAt?: any;
  verificationComments?: string;
}



export async function getVenueTeamsForMatchDay(venueId: string, volunteerId: string) {
  try {
    const startTime = Date.now();

    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to perform match day verification" };
    }

    // Query for teams assigned to this venue at different levels
    const [clusterQuery, divisionQuery, finalQuery] = await Promise.all([
      adminDb
        .collection('teamVenueAssignment')
        .where('clusterVenueId', '==', venueId)
        .get(),
      adminDb
        .collection('teamVenueAssignment')
        .where('divisionVenueId', '==', venueId)
        .get(),
      adminDb
        .collection('teamVenueAssignment')
        .where('finalVenueId', '==', venueId)
        .get()
    ]);

    // Combine all assignment documents
    const allAssignments = [...clusterQuery.docs, ...divisionQuery.docs, ...finalQuery.docs];
    
    if (allAssignments.length === 0) {
      return { success: true, teams: [] };
    }

    const teamIds = allAssignments.map(doc => doc.data().teamId);

    const [teamDocs, ...playerSnapshots] = await Promise.all([
      adminDb.getAll(...teamIds.map(id => adminDb.collection('teams').doc(id))),
      ...teamIds.map(teamId => 
        adminDb.collection('teams').doc(teamId).collection('players').get()
      )
    ]);

    const teamLookup = new Map();
    teamDocs.forEach(doc => {
      if (doc.exists) {
        teamLookup.set(doc.id, serializeFirestoreData(doc.data())); // serialize here
      }
    });

    const teamProcessingPromises = allAssignments.map(async (assignmentDoc, index) => {
      const assignment = assignmentDoc.data();
      const teamData = teamLookup.get(assignment.teamId);
      const playersSnapshot = playerSnapshots[index];

      if (!teamData) return null;

      const activePlayers = playersSnapshot.docs.filter(doc => doc.data().isDeleted !== true);
      const verifiedPlayersCount = activePlayers.filter(doc =>
        doc.data().verificationStatus === 'approved'
      ).length;

      return {
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
        teamImageUrl: teamData.teamImageUrl,
        verifiedPlayersCount
      };
    });

    const processedTeams = await Promise.all(teamProcessingPromises);
    const teams = processedTeams.filter(team => team !== null);

    const endTime = Date.now();

    return {
      success: true,
      teams: teams
    };

  } catch (error) {
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

    const teamData = serializeFirestoreData(teamDoc.data());

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
      let userDocuments = serializeFirestoreData(playerData.documents);
      if (playerData.userId && !playerData.userId.startsWith('user_')) {
        try {
          const userDocRef = adminDb.collection("users").doc(playerData.userId);
          const userDoc = await userDocRef.get();
          if (userDoc.exists) {
            const freshUserData = userDoc.data();
            if (freshUserData?.documents) {
              userDocuments = serializeFirestoreData(freshUserData.documents);
            }
          }
        } catch (error) {
          // Could not load fresh documents for player - using existing data
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
        documents: serializeFirestoreData({
          profilePhoto: userDocuments?.profilePhoto || { url: null, verified: false, storagePath: null, uploadedBy: null, uploadedAt: null },
          aadhaarFront: userDocuments?.aadhaarFront || { url: null, verified: false, storagePath: null, uploadedBy: null, uploadedAt: null },
          aadhaarBack: userDocuments?.aadhaarBack || { url: null, verified: false, storagePath: null, uploadedBy: null, uploadedAt: null }
        }),
        verificationStatus: playerData.verificationStatus || 'pending',
        verifiedBy: playerData.verifiedBy,
        verifiedAt: serializeFirestoreData(playerData.verifiedAt) || null,
        verificationComments: playerData.verificationComments || ''
      });
    }

    return {
      success: true,
      team: {
        id: teamDoc.id,
        name: teamData?.name,
        sportName: teamData?.sportName,
        captainProfile: teamData?.captainProfile,
        panchayat: teamData?.panchayat,
        district: teamData?.district,
        currentPlayers: teamData?.currentPlayers || 0,
        maxPlayers: teamData?.maxPlayers || 0,
        status: teamData?.status,
        matchDayStatus: teamData?.matchDayStatus || 'pending',
        teamImageUrl: teamData?.teamImageUrl,
        clusterVenue: teamData?.clusterVenue,
        // Convert Firestore timestamps to strings
        createdAt: serializeFirestoreData(teamData?.createdAt) || null,
        submittedAt: serializeFirestoreData(teamData?.submittedAt) || null,
        verifiedAt: serializeFirestoreData(teamData?.verifiedAt) || null,
        updatedAt: serializeFirestoreData(teamData?.updatedAt) || null
      },
      players: players
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get team details"
    };
  }
}

export async function verifyPlayerMatchDay(request: MatchDayPlayerVerification & { teamId?: string; venueId?: string }) {
  try {
    const { playerId, status, comments, verifiedBy, verificationIssues, teamId, venueId } = request;

    if (!playerId || !status || !['pending', 'verified', 'approved', 'rejected'].includes(status)) {
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

    // Update player verification status
    await playerDocRef.update({
      verificationStatus: status,
      verifiedBy: verifiedBy,
      verifiedAt: FieldValue.serverTimestamp(),
      verificationComments: comments || '',
      verificationIssues: verificationIssues || [],
      updatedAt: FieldValue.serverTimestamp()
    });

    // Get current team status and all players to determine new team status
    if (!finalTeamId) {
      return { success: false, error: "Could not determine team for player" };
    }
    
    const [teamDoc, allPlayersQuery] = await Promise.all([
      adminDb.collection('teams').doc(finalTeamId).get(),
      adminDb.collection('teams').doc(finalTeamId as string).collection('players').get()
    ]);

    const teamData = teamDoc.data();
    const activePlayers = allPlayersQuery.docs.filter(doc => doc.data().isDeleted !== true);
    
    // Count players by status
    const playersByStatus = {
      pending: 0,
      verified: 0,
      approved: 0,
      rejected: 0
    };
    
    activePlayers.forEach(doc => {
      const playerStatus = doc.data().verificationStatus || 'pending';
      if (playerStatus in playersByStatus) {
        playersByStatus[playerStatus as keyof typeof playersByStatus]++;
      }
    });

    const totalPlayers = activePlayers.length;
    const hasRejectedPlayers = playersByStatus.rejected > 0;
    const hasPendingPlayers = playersByStatus.pending > 0;
    const allPlayersVerified = playersByStatus.verified === totalPlayers;
    const allPlayersApproved = playersByStatus.approved === totalPlayers;

    // Determine new team status based on new flow: submitted -> verified -> checked-in
    let newTeamStatus = teamData?.status || 'submitted';
    let shouldUpdateTeam = false;

    if (hasRejectedPlayers) {
      // Any rejected player → team becomes rejected
      newTeamStatus = 'rejected';
      shouldUpdateTeam = true;
    } else if (allPlayersApproved) {
      // All players approved by technical volunteer → team becomes checked-in (from any status)
      newTeamStatus = 'checked_in';
      shouldUpdateTeam = true;
    } else if (allPlayersVerified && (teamData?.status === 'submitted' || teamData?.status === 'rejected')) {
      // All players verified by verification volunteer → team becomes verified
      newTeamStatus = 'verified';  
      shouldUpdateTeam = true;
    } else if (hasPendingPlayers && (teamData?.status === 'verified' || teamData?.status === 'checked_in')) {
      // Any pending player when team was verified/checked-in → revert to submitted  
      newTeamStatus = 'submitted';
      shouldUpdateTeam = true;
    }

    // Update team status if needed
    if (shouldUpdateTeam) {
      const updateData: any = {
        status: newTeamStatus,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (newTeamStatus === 'checked_in') {
        // Auto-check in the team when all players are approved
        let teamVenueId = venueId;
        if (!teamVenueId) {
          const venueAssignmentQuery = await adminDb
            .collection('teamVenueAssignment')
            .where('teamId', '==', finalTeamId)
            .limit(1)
            .get();
          
          if (!venueAssignmentQuery.empty) {
            teamVenueId = venueAssignmentQuery.docs[0].data().venueId;
          }
        }

        const teamEventId = teamData?.eventId || 'isha_gramotsavam_2025';

        updateData.checkedIn = true;
        updateData.checkedInVenue = teamVenueId;
        updateData.eventId = teamEventId;
        updateData.checkedInAt = FieldValue.serverTimestamp();
        updateData.checkedInBy = 'auto_system';
        updateData.autoCheckedIn = true;
      } else if (newTeamStatus === 'submitted' || newTeamStatus === 'rejected') {
        // Reset check-in status when rolling back
        updateData.checkedIn = false;
        updateData.checkedInVenue = null;
        updateData.checkedInAt = null;
        updateData.checkedInBy = null;
        updateData.autoCheckedIn = false;
      }

      await adminDb.collection('teams').doc(finalTeamId).update(updateData);

      // Revalidate relevant pages
      if (venueId) {
        revalidatePath(`/volunteer/venues/${venueId}`);
        revalidatePath(`/volunteer/venues/${venueId}/teams`);
        revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
      }
    }

    // Log audit for on-ground verification
    try {
      const teamDoc = await adminDb.collection('teams').doc(finalTeamId).get();
      const teamData = teamDoc.data();
      const playerDoc = await playerDocRef.get();
      const playerData = playerDoc.data();

      if (teamData && playerData && userData) {
        // Only log for verification statuses that the audit service supports
        if (status === 'verified' || status === 'rejected') {
          await auditLogService.logOnGroundVerification(
            verifiedBy, // volunteerId
            `${userData.firstName} ${userData.lastName}`.trim(), // volunteerName
            playerId, // playerId
            playerData.name || 'Unknown Player', // playerName
            finalTeamId, // teamId
            teamData.name || 'Unknown Team', // teamName
            venueId || 'Unknown Venue', // venue
            status, // status
            comments || undefined // comments
          );
        }
      }
    } catch (auditError) {
      // Don't fail the main operation if audit logging fails
    }

    return {
      success: true,
      message: `Player ${status} successfully`,
      teamStatus: newTeamStatus,
      teamStatusChanged: shouldUpdateTeam,
      playerCounts: playersByStatus
    };

  } catch (error) {
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

    return {
      success: true,
      message: "Team image uploaded successfully"
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload team image"
    };
  }
}