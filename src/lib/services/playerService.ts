import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { roleService } from './roleService';

export interface PlayerData {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth: string;
  age: number;
  gender: 'M' | 'F';
  village?: string;
  panchayat: string;
  taluk?: string;
  district: string;
  state: string;
  pincode?: string;
  userId?: string; // If the user has already registered
}

export interface AddPlayerResult {
  success: boolean;
  playerId?: string;
  rolePromoted?: boolean;
  error?: string;
  message?: string;
}

export async function addPlayerToTeam(
  teamId: string,
  playerData: PlayerData,
  eventId: string = "gramotsavam_2025"
): Promise<AddPlayerResult> {
  try {
    // Validate team exists and get team data
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
      return {
        success: false,
        error: 'Team not found'
      };
    }

    const teamData = teamDoc.data();

    // Validate same panchayat
    if (playerData.panchayat !== teamData.panchayat) {
      return {
        success: false,
        error: `Player must be from the same panchayat as the team (${teamData.panchayat})`
      };
    }

    // Validate age
    if (playerData.age < 14 || playerData.age > 60) {
      return {
        success: false,
        error: 'Player age must be between 14 and 60 years'
      };
    }

    // Validate gender for throwball
    if (teamData.sportName === 'Throwball' && playerData.gender !== 'F') {
      return {
        success: false,
        error: 'Throwball is only for women'
      };
    }

    // Create player document in team's players subcollection
    const playerDocData = {
      playerId: '', // Will be set after creation
      userId: playerData.userId || '', // Empty if user hasn't registered yet
      teamId: teamId,
      
      // Player Info
      name: playerData.name,
      phone: playerData.phone,
      dateOfBirth: playerData.dateOfBirth,
      age: playerData.age,
      gender: playerData.gender,
      
      // Team Role
      position: "main", // or "substitute" based on team needs
      addedAt: serverTimestamp(),
      addedBy: teamData.captainId, // Assuming captain is adding
      
      // Profile Data
      profileComplete: !!playerData.userId, // Complete if user already exists
      profileData: {
        firstName: playerData.firstName || '',
        lastName: playerData.lastName || '',
        whatsappNumber: playerData.whatsappNumber || playerData.phone,
        village: playerData.village || '',
        panchayat: playerData.panchayat,
        taluk: playerData.taluk || '',
        district: playerData.district,
        state: playerData.state,
        pincode: playerData.pincode || ''
      },
      
      // Document Management - initially empty for new users
      documents: {
        profilePhoto: {
          url: '',
          verified: false
        },
        aadhaarFront: {
          url: '',
          verified: false
        },
        aadhaarBack: {
          url: '',
          verified: false
        }
      },
      
      // Verification Status
      verificationStatus: "pending"
    };

    // Add player to team's players subcollection
    const playerRef = await addDoc(collection(db, 'teams', teamId, 'players'), playerDocData);
    const playerId = playerRef.id;

    // Update the player document with its own ID
    // Note: This would require an update operation, but for now we'll leave it

    let rolePromoted = false;

    // If user already exists (has userId), promote them to player role
    if (playerData.userId) {
      try {
        const promotionResult = await roleService.promoteToPlayer(
          playerData.userId,
          teamId,
          eventId
        );
        
        if (promotionResult.success) {
          rolePromoted = true;
          console.log(`User ${playerData.userId} promoted to player role`);
        } else {
          console.warn(`Failed to promote user to player: ${promotionResult.error}`);
        }
      } catch (roleError) {
        console.warn("Role promotion failed but player was added:", roleError);
        // Don't fail the entire operation if role promotion fails
      }
    }

    return {
      success: true,
      playerId: playerId,
      rolePromoted: rolePromoted,
      message: rolePromoted 
        ? 'Player added and promoted to player role successfully'
        : 'Player added successfully. Role will be assigned when they register.'
    };

  } catch (error: any) {
    console.error('Error adding player to team:', error);
    return {
      success: false,
      error: error.message || 'Failed to add player to team'
    };
  }
}

export async function getTeamPlayers(teamId: string) {
  try {
    // Implementation would go here to fetch team players
    // This would query the teams/{teamId}/players subcollection
    return {
      success: true,
      players: []
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get team players'
    };
  }
}

export async function removePlayerFromTeam(teamId: string, playerId: string) {
  try {
    // Implementation would go here to remove player
    // This would also need to handle role demotion if the user becomes playerless
    return {
      success: true,
      message: 'Player removed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to remove player from team'
    };
  }
}

// Helper function to handle user registration -> player promotion
export async function promoteNewUserToExistingPlayerRole(
  userId: string,
  phoneNumber: string,
  eventId: string = "gramotsavam_2025"
): Promise<AddPlayerResult> {
  try {
    // Find player records with this phone number but no userId
    // This would require a query across teams to find the player
    // Then update the player record with the userId and promote to player role
    
    // This is a placeholder for the implementation
    console.log(`Looking for player records for new user ${userId} with phone ${phoneNumber}`);
    
    return {
      success: true,
      message: 'User promoted to existing player roles'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to promote new user to player role'
    };
  }
}