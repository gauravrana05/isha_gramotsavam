'use server';

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
  pincode?: string;
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

async function checkPlayerExistsInTeam(phone: string, teamId: string): Promise<boolean> {
  const playersSnapshot = await adminDb
    .collection("teams").doc(teamId)
    .collection("players")
    .where("phone", "==", phone)
    .get();

  const activePlayers = playersSnapshot.docs.filter(doc => {
    const data = doc.data();
    return !data.isDeleted;
  });

  return activePlayers.length > 0;
}

async function checkPlayerExistsInEvent(phone: string, eventId: string): Promise<{ exists: boolean; teamId?: string; teamName?: string }> {
  try {
    const teamsRef = adminDb.collection("teams");
    const query = teamsRef
      .where("eventId", "==", eventId)
      .where("captainProfile.phone", "==", phone);

    const snapshot = await query.get();
    if (!snapshot.empty) {
      const teamDoc = snapshot.docs[0];
      return {
        exists: true,
        teamId: teamDoc.id,
        teamName: teamDoc.data().name,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking player existence:", error);
    return { exists: false };
  }
}

export async function addPlayerToTeam({ teamId, playerData, captainId }: AddPlayerRequest) {
  try {
    console.log(`Adding player ${playerData.name} to team ${teamId}`);

    // Basic validations first
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }

    const teamData = teamDoc.data()!;
    if (teamData.captainId !== captainId) {
      return { success: false, error: "Unauthorized: You are not the captain of this team" };
    }

    // Check if player already exists in this team
    const playerExists = await checkPlayerExistsInTeam(playerData.phone, teamId);
    if (playerExists) {
      return { success: false, error: "Player already exists in this team" };
    }

    // Age validation
    const playerAge = calculateAge(playerData.dateOfBirth);
    if (playerAge === null || playerAge < 14 || playerAge > 60) {
      return { success: false, error: "Player age must be between 14 and 60" };
    }

    // Extract phone number without +91 prefix and format for Firebase Auth
    const cleanPhone = playerData.phone.replace(/^\+91/, '');
    const formattedPhone = `+91${cleanPhone}`;

    // Check if Firebase Auth user already exists or create new one
    let userId: string;
    let existingUser = false;

    try {
      // Try to find existing Firebase Auth user
      const existingAuthUser = await adminAuth.getUserByPhoneNumber(formattedPhone);
      userId = existingAuthUser.uid;
      existingUser = true;
      
      console.log(`Found existing Firebase Auth user: ${userId}`);
      
      // Update their profile with current team info
      await adminDb.collection("users").doc(userId).update({
        currentTeamId: teamId,
        updatedAt: FieldValue.serverTimestamp()
      });
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        const userRecord = await adminAuth.createUser({
          phoneNumber: formattedPhone,
          displayName: playerData.name,
          disabled: false
        });
        
        userId = userRecord.uid;
        existingUser = false;
        
        console.log(`Created new Firebase Auth user: ${userId}`);
        
        // The beforeUserCreated trigger will create the basic profile
        // We'll update it with player-specific data after
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
        
        // Update with player-specific data
        await adminDb.collection("users").doc(userId).update({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          phoneNumber: cleanPhone,
          whatsappNumber: playerData.whatsappNumber || cleanPhone,
          dob: playerData.dateOfBirth,
          gender: playerData.gender,
          village: playerData.village,
          panchayat: playerData.panchayat,
          taluk: playerData.taluk,
          district: playerData.district,
          state: playerData.state,
          pincode: playerData.pincode || "",
          role: "player",
          currentTeamId: teamId,
          isProfileComplete: false,
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        throw error;
      }
    }

    // Now add the player to the team subcollection
    await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb
        .collection("teams").doc(teamId)
        .collection("players").doc(userId);

      // Get the user data to copy documents structure
      const userDoc = await adminDb.collection("users").doc(userId).get();
      const userData = userDoc.data();

      transaction.set(playerRef, {
        playerId: userId,
        userId: userId,
        teamId: teamId,

        name: playerData.name,
        phone: cleanPhone,
        dateOfBirth: playerData.dateOfBirth,
        age: playerAge,
        gender: playerData.gender,

        position: playerData.position,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: captainId,

        isProfileComplete: userData?.isProfileComplete || false,
        profileData: {
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          whatsappNumber: playerData.whatsappNumber || cleanPhone,
          village: playerData.village,
          panchayat: playerData.panchayat,
          taluk: playerData.taluk,
          district: playerData.district,
          state: playerData.state,
          pincode: playerData.pincode || ""
        },

        documents: userData?.documents || {
          profilePhoto: { storagePath: "", url: null, verified: false, uploadedAt: null, uploadedBy: null },
          aadhaarFront: { storagePath: "", url: null, verified: false, uploadedAt: null, uploadedBy: null },
          aadhaarBack: { storagePath: "", url: null, verified: false, uploadedAt: null, uploadedBy: null }
        },
        
        verificationStatus: userData?.verificationStatus || "pending",
        isDeleted: false
      });

      // Update team player count
      const teamRef = adminDb.collection("teams").doc(teamId);
      const currentCount = teamData.currentPlayers || 0;
      const currentSubs = teamData.currentSubstitutes || 0;

      transaction.update(teamRef, {
        currentPlayers: playerData.position === 'main' ? currentCount + 1 : currentCount,
        currentSubstitutes: playerData.position === 'substitute' ? currentSubs + 1 : currentSubs,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    console.log(`Player ${userId} added to team ${teamId} using Firebase Auth`);

    return {
      success: true,
      playerId: userId,
      message: existingUser ? "Existing user linked to team" : "New user created and added to team"
    };
  } catch (error) {
    console.error("Error adding player to team:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add player to team"
    };
  }
}
