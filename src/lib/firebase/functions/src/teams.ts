import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";


// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

function calculateAge(dob: string): number | null {
  if (!dob) return null; // Return null if date of birth is not provided
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null; // Return null if the date is invalid

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Enhanced team creation according to comprehensive schema


// Add player to team with complete schema
export const addPlayerToTeam = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId, playerData} = data;
    
    // Validate team ownership
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamInfo = teamDoc.data();
    if (teamInfo?.captainId !== auth.uid) {
      throw new HttpsError("permission-denied", "Not authorized to manage this team");
    }

    // Check team capacity
    if (teamInfo.currentPlayers >= teamInfo.maxPlayers) {
      throw new HttpsError("invalid-argument", "Team is at maximum capacity");
    }

    // Check if player is already in another team for this event (by phone)
    const eventId = teamInfo.eventId || "gramotsavam_2025";
    const phoneExistsCheck = await checkPlayerExistsInEvent(playerData.phone, eventId, 'phone');
    if (phoneExistsCheck.exists) {
      throw new HttpsError("invalid-argument", `Player with phone ${playerData.phone} is already registered in team "${phoneExistsCheck.teamName}" for this event. Each player can only join one team per event.`);
    }

    // If player has userId, also check by userId
    if (playerData.userId) {
      const userIdExistsCheck = await checkPlayerExistsInEvent(playerData.userId, eventId, 'userId');
      if (userIdExistsCheck.exists) {
        throw new HttpsError("invalid-argument", `Player is already registered in team "${userIdExistsCheck.teamName}" for this event. Each player can only join one team per event.`);
      }
    }

    // Validate other player eligibility rules
    await validatePlayerEligibility(playerData, teamInfo);

    // Check for existing membership in this specific team (to prevent duplicates)
    const existingPlayer = await checkExistingMembership(playerData.phone, teamId);
    if (existingPlayer) {
      throw new HttpsError("invalid-argument", "Player is already in this team");
    }
    
    // **THE FIX IS HERE**
    // Safely calculate the player's age
    const playerAge = calculateAge(playerData.dateOfBirth);


    // Create Firebase user directly 
    let firebaseUserId = "";
    try {
      // Check if user with this phone number already exists
      try {
        const existingUser = await admin.auth().getUserByPhoneNumber(`+91${playerData.phone}`);
        firebaseUserId = existingUser.uid;
        console.log(`Using existing Firebase user: ${firebaseUserId}`);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.error("Error checking existing user:", error);
          throw error;
        }
        // Create new Firebase user
        const userRecord = await admin.auth().createUser({
          phoneNumber: `+91${playerData.phone}`,
          displayName: playerData.name,
          disabled: false
        });
        firebaseUserId = userRecord.uid;
        console.log(`Created new Firebase user: ${firebaseUserId}`);
      }
      
      // Update user profile in Firestore (the createUserProfile trigger handles basic profile)
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
        isProfileComplete: false,
        currentTeamId: teamId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await admin.firestore().collection("users").doc(firebaseUserId).set(userProfileData, { merge: true });
      console.log(`Updated user profile for: ${firebaseUserId}`);
      
    } catch (error) {
      console.error("Error creating Firebase user:", error);
      throw new HttpsError("internal", `Failed to create user account for player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Use Firebase UID as playerId
    const playerId = firebaseUserId;
    
    await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .set({
        playerId: playerId,
        userId: firebaseUserId, // Real Firebase user ID
        teamId: teamId,
        
        // Player Info
        name: playerData.name,
        phone: playerData.phone,
        dateOfBirth: playerData.dateOfBirth,
        age: playerAge, // Use the safely calculated age
        gender: playerData.gender,
        
        // Team Role
        position: "main",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: auth.uid,
        
        // Profile Data
        profileComplete: false,
        profileData: {
          firstName: playerData.firstName || "",
          lastName: playerData.lastName || "",
          whatsappNumber: playerData.whatsappNumber || playerData.phone,
          village: playerData.village || "",
          panchayat: playerData.panchayat,
          taluk: playerData.taluk || "",
          district: playerData.district,
          state: playerData.state,
          pincode: playerData.pincode || ""
        },
        
        // Document Management - initially empty
        documents: {
          profilePhoto: {
            verified: false
          },
          aadhaarFront: {
            verified: false
          },
          aadhaarBack: {
            verified: false
          }
        },
        
        // Verification Status
        verificationStatus: "pending"
      });

    // Update team player count
    await admin.firestore().collection("teams").doc(teamId).update({
      currentPlayers: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update verification record
    await updateVerificationRecord(teamId);

    console.log(`Player ${playerId} added to team ${teamId}`);

    return {
      success: true,
      playerId: playerId,
      message: "Player added successfully"
    };
  } catch (error) {
    console.error("Error adding player to team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to add player to team", {
      originalError: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Submit team for verification with complete workflow
export const submitTeamForVerificationEnhanced = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamId} = data;
    
    // Validate team completeness
    const team = await validateTeamForSubmission(teamId, auth.uid);
    
    // Update team status
    await admin.firestore().collection("teams").doc(teamId).update({
      status: "submitted",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create comprehensive notification for verification volunteers
    await admin.firestore().collection("notifications").add({
      type: "team_submitted_for_verification",
      title: "New Team Submitted for Verification",
      message: `Team "${team.name}" (${team.sportName}) has been submitted for verification`,
      teamId: teamId,
      targetRoles: ["verification_volunteer", "admin"],
      data: {
        teamName: team.name,
        sportName: team.sportName,
        captainName: team.captainProfile.name,
        playerCount: team.currentPlayers,
        panchayat: team.panchayat,
        district: team.district,
        genderCategory: team.genderCategory || 'mixed'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    // Send confirmation to captain
    await admin.firestore().collection("notifications").add({
      type: "team_submission_confirmation",
      title: "Team Submitted Successfully",
      message: `Your team "${team.name}" has been submitted for verification. You will be notified once the review is complete.`,
      teamId: teamId,
      targetUsers: [auth.uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to submit team for verification", {
      originalError: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper Functions
async function checkPlayerExistsInEvent(playerIdentifier: string, eventId: string, identifierType: 'userId' | 'phone'): Promise<{ exists: boolean, teamId?: string, teamName?: string }> {
  try {
    // Query all teams in the event
    const teamsQuery = await admin.firestore()
      .collection("teams")
      .where("eventId", "==", eventId)
      .get();

    for (const teamDoc of teamsQuery.docs) {
      // Check players in each team
      const playersQuery = await admin.firestore()
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
    return { exists: false }; // Fail-safe
  }
}

async function validatePlayerEligibility(playerData: any, teamInfo: any): Promise<void> {
  // Age validation
  const age = calculateAge(playerData.dateOfBirth);
  if (age === null) {
      throw new HttpsError("invalid-argument", "Could not calculate player's age from the provided date of birth.");
  }
  if (age < 14 || age > 60) {
    throw new HttpsError("invalid-argument", `Player age must be between 14 and 60, but is ${age}`);
  }

  // Gender validation for throwball
  if (teamInfo.sportName === 'Throwball' && playerData.gender !== 'F') {
    throw new HttpsError("invalid-argument", "Throwball is only for women");
  }

  // Same panchayat validation
  if (playerData.panchayat !== teamInfo.panchayat) {
    throw new HttpsError("invalid-argument", `All players must be from the same panchayat (${teamInfo.panchayat}). Player is from ${playerData.panchayat}.`);
  }
}

async function checkExistingMembership(phone: string, teamId: string): Promise<boolean> {
  const playersSnapshot = await admin.firestore()
    .collection("teams").doc(teamId)
    .collection("players")
    .where("phone", "==", phone)
    .get();

  return !playersSnapshot.empty;
}

async function validateTeamForSubmission(teamId: string, captainId: string): Promise<any> {
  const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
  
  if (!teamDoc.exists) {
    throw new HttpsError("not-found", "Team not found");
  }

  const team = teamDoc.data();
  
  if (team?.captainId !== captainId) {
    throw new HttpsError("permission-denied", "Not authorized to submit this team");
  }

  if (team.currentPlayers < team.maxPlayers) {
    throw new HttpsError("invalid-argument", `Team needs ${team.maxPlayers - team.currentPlayers} more players`);
  }

  return team;
}

async function updateVerificationRecord(teamId: string): Promise<void> {
  const playersSnapshot = await admin.firestore()
    .collection("teams").doc(teamId)
    .collection("players").get();

  const totalPlayers = playersSnapshot.size;
  const verifiedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "approved"
  ).length;
  const rejectedPlayers = playersSnapshot.docs.filter(doc => 
    doc.data().verificationStatus === "rejected"
  ).length;
  const pendingPlayers = totalPlayers - verifiedPlayers - rejectedPlayers;

  await admin.firestore()
    .collection("teams").doc(teamId)
    .collection("verification").doc("initial")
    .update({
      playersTotal: totalPlayers,
      playersVerified: verifiedPlayers,
      playersRejected: rejectedPlayers,
      playersPending: pendingPlayers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
