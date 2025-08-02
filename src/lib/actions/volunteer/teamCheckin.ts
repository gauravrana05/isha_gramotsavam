'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

interface PlayerVerification {
  playerId: string;
  verified: boolean;
  notes?: string;
  verificationIssues?: string[];
}

export async function verifyTeamPlayers(
  teamId: string, 
  venueId: string,
  playerVerifications: PlayerVerification[]
) {
  try {
    const batch = adminDb.batch();
    
    // Update each player verification status
    for (const verification of playerVerifications) {
      const playerRef = adminDb.collection('teams').doc(teamId)
        .collection('players').doc(verification.playerId);
      
      batch.update(playerRef, {
        matchDayVerified: verification.verified,
        matchDayVerifiedAt: new Date(),
        verificationNotes: verification.notes || '',
        verificationIssues: verification.verificationIssues || []
      });
    }
    
    await batch.commit();
    
    revalidatePath(`/volunteer/venues/${venueId}/teams/${teamId}/check-in`);
    revalidatePath(`/volunteer/venues/${venueId}/teams`);
    
    return { 
      success: true, 
      message: 'Player verifications updated successfully' 
    };
  } catch (error) {
    console.error('Error verifying team players:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function checkInTeam(teamId: string, venueId: string, volunteerId: string) {
  try {
    // First verify all players are verified
    const playersSnapshot = await adminDb.collection('teams').doc(teamId)
      .collection('players').get();
    
    const teamSnapshot = await adminDb.collection('teams').doc(teamId).get();
    const teamData = teamSnapshot.data();
    
    if (!teamData) {
      return { success: false, error: 'Team not found' };
    }
    
    // Check if all players are verified
    const verifiedPlayers = playersSnapshot.docs.filter(doc => 
      doc.data().matchDayVerified === true
    );
    
    if (verifiedPlayers.length !== playersSnapshot.size) {
      return { 
        success: false, 
        error: `Only ${verifiedPlayers.length} out of ${playersSnapshot.size} players are verified` 
      };
    }
    
    // Update team check-in status
    await adminDb.collection('teams').doc(teamId).update({
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInVenue: venueId,
      checkedInBy: volunteerId
    });
    
    // Find and update fixture with checked-in team
    const fixturesQuery = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .where('assignedTeams', 'array-contains', teamId)
      .where('status', 'in', ['draft', 'teams_assigned'])
      .get();
    
    if (!fixturesQuery.empty) {
      for (const fixtureDoc of fixturesQuery.docs) {
        const currentCheckedInTeams = fixtureDoc.data().checkedInTeams || [];
        if (!currentCheckedInTeams.includes(teamId)) {
          await fixtureDoc.ref.update({
            checkedInTeams: FieldValue.arrayUnion(teamId),
            updatedAt: new Date()
          });
        }
      }
    }
    
    revalidatePath(`/volunteer/venues/${venueId}/teams`);
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    
    return { 
      success: true, 
      message: 'Team checked in successfully' 
    };
  } catch (error) {
    console.error('Error checking in team:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getVenueTeams(venueId: string, eventId: string) {
  try {
    // Get teams assigned to this venue
    const teamsQuery = await adminDb.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('eventId', '==', eventId)
      .get();
    
    const teamIds = teamsQuery.docs.map(doc => doc.data().teamId);
    
    if (teamIds.length === 0) {
      return { success: true, teams: [] };
    }
    
    // Get team details
    const teamsData = [];
    for (const teamId of teamIds) {
      const teamDoc = await adminDb.collection('teams').doc(teamId).get();
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        
        // Get player count and verification status
        const playersSnapshot = await adminDb.collection('teams').doc(teamId)
          .collection('players').get();
        
        const verifiedPlayersCount = playersSnapshot.docs.filter(doc => 
          doc.data().matchDayVerified === true
        ).length;
        
        teamsData.push({
          id: teamId,
          ...teamData,
          playerCount: playersSnapshot.size,
          verifiedPlayersCount,
          allPlayersVerified: verifiedPlayersCount === playersSnapshot.size
        });
      }
    }
    
    return { success: true, teams: teamsData };
  } catch (error) {
    console.error('Error getting venue teams:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      teams: []
    };
  }
}

export async function getTeamPlayersForVerification(teamId: string) {
  try {
    const playersSnapshot = await adminDb.collection('teams').doc(teamId)
      .collection('players').get();
    
    const players = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      matchDayVerified: doc.data().matchDayVerified || false,
      verificationNotes: doc.data().verificationNotes || '',
      verificationIssues: doc.data().verificationIssues || []
    }));
    
    return { success: true, players };
  } catch (error) {
    console.error('Error getting team players:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      players: []
    };
  }
}

export async function uncheckTeam(teamId: string, venueId: string, reason: string) {
  try {
    // Update team status
    await adminDb.collection('teams').doc(teamId).update({
      checkedIn: false,
      uncheckedAt: new Date(),
      uncheckReason: reason
    });
    
    // Remove from fixture checked-in teams
    const fixturesQuery = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .where('checkedInTeams', 'array-contains', teamId)
      .get();
    
    for (const fixtureDoc of fixturesQuery.docs) {
      await fixtureDoc.ref.update({
        checkedInTeams: FieldValue.arrayRemove(teamId),
        updatedAt: new Date()
      });
    }
    
    revalidatePath(`/volunteer/venues/${venueId}/teams`);
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    
    return { 
      success: true, 
      message: 'Team unchecked successfully' 
    };
  } catch (error) {
    console.error('Error unchecking team:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}