'use server';

import { db } from '@/lib/firebase/config';
import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  runTransaction
} from 'firebase/firestore';

interface AddPlayerToTeamParams {
  teamId: string;
  playerEmail: string;
}

interface RemovePlayerFromTeamParams {
  teamId: string;
  playerId: string;
}

export async function addPlayerToTeam({ teamId, playerEmail }: AddPlayerToTeamParams) {
  try {
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', playerEmail.toLowerCase().trim())
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      return {
        success: false,
        error: 'User not found with this email address'
      };
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if user profile is complete
    if (!userData.isProfileComplete) {
      return {
        success: false,
        error: 'User must complete their profile before joining a team'
      };
    }

    // Get team data
    const teamRef = doc(db, 'teams', teamId);
    const teamSnapshot = await getDoc(teamRef);
    
    if (!teamSnapshot.exists()) {
      return {
        success: false,
        error: 'Team not found'
      };
    }

    const teamData = teamSnapshot.data();

    // Check if user is from the same location as team
    if (
      userData.panchayat !== teamData.panchayat ||
      userData.district !== teamData.district ||
      userData.state !== teamData.state
    ) {
      return {
        success: false,
        error: 'Player must be from the same panchayat as the team'
      };
    }

    // Check if user is already in this team
    const existingPlayerQuery = query(
      collection(db, 'teamPlayers'),
      where('teamId', '==', teamId),
      where('playerId', '==', userId)
    );
    const existingPlayerSnapshot = await getDocs(existingPlayerQuery);
    
    if (!existingPlayerSnapshot.empty) {
      return {
        success: false,
        error: 'Player is already in this team'
      };
    }

    // Check if user is already in another team for the same sport
    const existingTeamQuery = query(
      collection(db, 'teamPlayers'),
      where('playerId', '==', userId)
    );
    const existingTeamSnapshot = await getDocs(existingTeamQuery);
    
    for (const doc of existingTeamSnapshot.docs) {
      const playerData = doc.data();
      const playerTeamRef = await getDoc(doc(db, 'teams', playerData.teamId));
      const playerTeamData = playerTeamRef.data();
      
      if (playerTeamData?.sportId === teamData.sportId) {
        return {
          success: false,
          error: 'Player is already registered for another team in this sport'
        };
      }
    }

    // Check team capacity
    const currentPlayersQuery = query(
      collection(db, 'teamPlayers'),
      where('teamId', '==', teamId)
    );
    const currentPlayersSnapshot = await getDocs(currentPlayersQuery);
    
    if (currentPlayersSnapshot.size >= teamData.maxPlayers) {
      return {
        success: false,
        error: 'Team has reached maximum capacity'
      };
    }

    // Add player to team
    await addDoc(collection(db, 'teamPlayers'), {
      teamId,
      playerId: userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      gender: userData.gender,
      dateOfBirth: userData.dateOfBirth,
      panchayat: userData.panchayat,
      district: userData.district,
      state: userData.state,
      verificationStatus: 'pending',
      role: 'player',
      joinedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Player added successfully'
    };

  } catch (error) {
    console.error('Error adding player to team:', error);
    return {
      success: false,
      error: 'Failed to add player to team'
    };
  }
}

export async function removePlayerFromTeam({ teamId, playerId }: RemovePlayerFromTeamParams) {
  try {
    // Find the team player record
    const teamPlayersQuery = query(
      collection(db, 'teamPlayers'),
      where('teamId', '==', teamId),
      where('playerId', '==', playerId)
    );
    const teamPlayersSnapshot = await getDocs(teamPlayersQuery);

    if (teamPlayersSnapshot.empty) {
      return {
        success: false,
        error: 'Player not found in this team'
      };
    }

    const playerDoc = teamPlayersSnapshot.docs[0];
    const playerData = playerDoc.data();

    // Check if player is captain
    if (playerData.role === 'captain') {
      return {
        success: false,
        error: 'Cannot remove team captain'
      };
    }

    // Remove player from team
    await deleteDoc(playerDoc.ref);

    // Update team status if needed
    await updateTeamStatusAfterPlayerChange(teamId);

    return {
      success: true,
      message: 'Player removed successfully'
    };

  } catch (error) {
    console.error('Error removing player from team:', error);
    return {
      success: false,
      error: 'Failed to remove player from team'
    };
  }
}

async function updateTeamStatusAfterPlayerChange(teamId: string) {
  try {
    // Get all players in the team
    const playersQuery = query(
      collection(db, 'teamPlayers'),
      where('teamId', '==', teamId)
    );
    const playersSnapshot = await getDocs(playersQuery);
    const players = playersSnapshot.docs.map(doc => doc.data());

    // Count players by status
    const playersByStatus = {
      pending: 0,
      verified: 0,
      approved: 0,
      rejected: 0
    };

    players.forEach(player => {
      const status = player.verificationStatus as keyof typeof playersByStatus;
      if (status in playersByStatus) {
        playersByStatus[status]++;
      }
    });

    // Get current team data
    const teamRef = doc(db, 'teams', teamId);
    const teamSnapshot = await getDoc(teamRef);
    const teamData = teamSnapshot.data();

    if (!teamData) return;

    const hasRejectedPlayers = playersByStatus.rejected > 0;
    const hasPendingPlayers = playersByStatus.pending > 0;
    const allPlayersVerified = players.length > 0 && 
      playersByStatus.verified + playersByStatus.approved === players.length;
    const allPlayersApproved = players.length > 0 && 
      playersByStatus.approved === players.length;

    let newTeamStatus = teamData.status;

    // Determine new team status based on player statuses
    if (hasRejectedPlayers) {
      newTeamStatus = 'rejected';
    } else if (hasPendingPlayers && (teamData.status === 'verified' || teamData.status === 'checked_in')) {
      newTeamStatus = 'submitted';
    } else if (allPlayersApproved && teamData.status !== 'checked_in') {
      newTeamStatus = 'checked_in';
    } else if (allPlayersVerified && teamData.status === 'submitted') {
      newTeamStatus = 'verified';
    }

    // Update team status if it changed
    if (newTeamStatus !== teamData.status) {
      await updateDoc(teamRef, {
        status: newTeamStatus,
        updatedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error updating team status:', error);
  }
}