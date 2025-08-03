'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface PlayerData {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  whatsappNumber?: string;
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  position: 'main' | 'substitute';
}

interface AddPlayerRequest {
  teamId: string;
  playerData: PlayerData;
  captainId: string;
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

async function checkPlayerExistsInEvent(playerIdentifier: string, eventId: string, identifierType: 'userId' | 'phone'): Promise<{ exists: boolean, teamId?: string, teamName?: string }> {
  try {
    // Query all teams in the event
    const teamsQuery = await adminDb
      .collection("teams")
      .where("eventId", "==", eventId)
      .get();

    for (const teamDoc of teamsQuery.docs) {
      // Check players in each team
      const playersQuery = await adminDb
        .collection("teams").doc(teamDoc.id)
        .collection("players")
        .where(identifierType, "==", playerIdentifier)
        .get();

      if (!playersQuery.empty) {
        const teamData = teamDoc.data();
        return {
          exists: true,
          teamId: teamDoc.id,
          teamName: teamData.name
        };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking player existence in event:", error);
    return { exists: false };
  }
}

async function validatePlayerEligibility(playerData: PlayerData, teamInfo: any): Promise<void> {
  // Age validation
  const age = calculateAge(playerData.dateOfBirth);
  if (age === null) {
    throw new Error("Could not calculate player's age from the provided date of birth.");
  }
  if (age < 14 || age > 60) {
    throw new Error(`Player age must be between 14 and 60, but is ${age}`);
  }

  // Gender validation for throwball
  if (teamInfo.sportName === 'Throwball' && playerData.gender !== 'F') {
    throw new Error("Throwball is only for women");
  }

  // Same panchayat validation
  if (playerData.panchayat !== teamInfo.panchayat) {
    throw new Error(`All players must be from the same panchayat (${teamInfo.panchayat}). Player is from ${playerData.panchayat}.`);
  }
}

async function checkExistingMembership(phone: string, teamId: string): Promise<boolean> {
  const playersSnapshot = await adminDb
    .collection("teams").doc(teamId)
    .collection("players")
    .where("phone", "==", phone)
    .get();

  return !playersSnapshot.empty;
}

export async function addPlayerToTeam(request: AddPlayerRequest) {
  try {
    const { teamId, playerData, captainId } = request;
    
    // Validate team ownership
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }

    const teamInfo = teamDoc.data();
    if (teamInfo?.captainId !== captainId) {
      return { success: false, error: "Not authorized to manage this team" };
    }

    // Check team capacity
    if (teamInfo.currentPlayers >= teamInfo.maxPlayers + teamInfo.maxSubstitutes) {
      return { success: false, error: "Team is at maximum capacity" };
    }

    // Check if player is already in another team for this event (by phone)
    const eventId = teamInfo.eventId || "gramotsavam_2025";
    const phoneExistsCheck = await checkPlayerExistsInEvent(playerData.phone, eventId, 'phone');
    if (phoneExistsCheck.exists) {
      return { 
        success: false, 
        error: `Player with phone ${playerData.phone} is already registered in team "${phoneExistsCheck.teamName}" for this event. Each player can only join one team per event.`
      };
    }

    // Validate player eligibility
    await validatePlayerEligibility(playerData, teamInfo);

    // Check for existing membership in this specific team
    const existingPlayer = await checkExistingMembership(playerData.phone, teamId);
    if (existingPlayer) {
      return { success: false, error: "Player is already in this team" };
    }
    
    // Calculate player age
    const playerAge = calculateAge(playerData.dateOfBirth);

    // Create or get Firebase user
    let firebaseUserId = "";
    let existingUserData = null;
    
    try {
      // Check if user with this phone number already exists
      try {
        const existingUser = await adminAuth.getUserByPhoneNumber(`+91${playerData.phone}`);
        firebaseUserId = existingUser.uid;
        console.log(`Using existing Firebase user: ${firebaseUserId}`);
        
        // Fetch existing user profile data including documents
        const userProfileDoc = await adminDb.collection("users").doc(firebaseUserId).get();
        if (userProfileDoc.exists) {
          existingUserData = userProfileDoc.data();
          console.log(`Found existing user profile with documents:`, !!existingUserData?.documents);
        }
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.error("Error checking existing user:", error);
          throw error;
        }
        // Create new Firebase user
        const userRecord = await adminAuth.createUser({
          phoneNumber: `+91${playerData.phone}`,
          displayName: playerData.name,
          disabled: false
        });
        firebaseUserId = userRecord.uid;
        console.log(`Created new Firebase user: ${firebaseUserId}`);
      }
      
      // Update user profile in Firestore
      const userProfileData = {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        phoneNumber: playerData.phone,
        whatsappNumber: playerData.whatsappNumber || playerData.phone,
        dob: playerData.dateOfBirth,
        gender: playerData.gender,
        village: playerData.village,
        panchayat: playerData.panchayat,
        taluk: playerData.taluk,
        district: playerData.district,
        state: playerData.state,
        role: "player",
        isProfileComplete: false, // Will be updated when documents are uploaded
        currentTeamId: teamId,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      await adminDb.collection("users").doc(firebaseUserId).set(userProfileData, { merge: true });
      console.log(`Updated user profile for: ${firebaseUserId}`);
      
    } catch (error) {
      console.error("Error creating Firebase user:", error);
      return { 
        success: false, 
        error: `Failed to create user account for player: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
    
    // Add player to team subcollection
    const playerId = firebaseUserId;
    
    await adminDb
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .set({
        playerId: playerId,
        userId: firebaseUserId,
        teamId: teamId,
        
        // Player Info
        name: playerData.name,
        phone: playerData.phone,
        dateOfBirth: playerData.dateOfBirth,
        age: playerAge,
        gender: playerData.gender,
        
        // Team Role
        position: playerData.position,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: captainId,
        
        // Profile Data
        profileComplete: existingUserData?.isProfileComplete || false,
        profileData: {
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          whatsappNumber: playerData.whatsappNumber || playerData.phone,
          village: playerData.village,
          panchayat: playerData.panchayat,
          taluk: playerData.taluk,
          district: playerData.district,
          state: playerData.state,
          pincode: ""
        },
        
        // Document Management - copy from existing user or start empty
        documents: (() => {
          if (existingUserData?.documents) {
            console.log(`Copying existing documents for user ${firebaseUserId}`);
            return existingUserData.documents;
          } else {
            console.log(`No existing documents found, creating empty document structure for user ${firebaseUserId}`);
            return {
              profilePhoto: {
                storagePath: "",
                url: null,
                verified: false,
                uploadedAt: null,
                uploadedBy: null
              },
              aadhaarFront: {
                storagePath: "",
                url: null,
                verified: false,
                uploadedAt: null,
                uploadedBy: null
              },
              aadhaarBack: {
                storagePath: "",
                url: null,
                verified: false,
                uploadedAt: null,
                uploadedBy: null
              }
            };
          }
        })(),
        
        // Verification Status - inherit from existing user if available
        verificationStatus: existingUserData?.verificationStatus || "pending"
      });

    // Update team player count
    const positionField = playerData.position === 'main' ? 'currentPlayers' : 'currentSubstitutes';
    await adminDb.collection("teams").doc(teamId).update({
      [positionField]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`Player ${playerId} added to team ${teamId}`);

    return {
      success: true,
      playerId: playerId,
      message: "Player added successfully"
    };
  } catch (error) {
    console.error("Error adding player to team:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to add player to team"
    };
  }
}