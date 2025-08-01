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
export const createTeamWithCompleteSchema = onCall(async (request: CallableRequest) => {
  const {data, auth} = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {teamData} = data;
    
    // Validate required fields
    if (!teamData.name || !teamData.sportName || !teamData.panchayat) {
      throw new HttpsError("invalid-argument", "Missing required team data");
    }

    // Get user profile for captain details
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userProfile = userDoc.data();
    
    if (!userProfile) {
      throw new HttpsError("not-found", "User profile not found");
    }
    
    // **THE FIX IS HERE**
    // Calculate age safely, handling cases where DOB might be missing or invalid.
    const captainAge = calculateAge(userProfile.dob);


    // Validate gender-sport eligibility
    if (teamData.sportName === 'Throwball' && userProfile.gender !== 'F') {
      throw new HttpsError("invalid-argument", "Throwball is only for women");
    }

    // Check if user is already captain or player in another team for this event
    const eventId = "gramotsavam_2025";
    const userExistsCheck = await checkPlayerExistsInEvent(auth.uid, eventId, 'userId');
    if (userExistsCheck.exists) {
      throw new HttpsError("invalid-argument", `You are already registered in team "${userExistsCheck.teamName}" for this event. Each player can only join one team per event.`);
    }

    // Also check by phone number in case there are existing records
    if (userProfile.phoneNumber) {
      const phoneExistsCheck = await checkPlayerExistsInEvent(userProfile.phoneNumber, eventId, 'phone');
      if (phoneExistsCheck.exists) {
        throw new HttpsError("invalid-argument", `A player with your phone number is already registered in team "${phoneExistsCheck.teamName}" for this event. Each player can only join one team per event.`);
      }
    }

    // Load sport configuration from database
    let sportConfig = null;
    try {
      const sportId = teamData.sportName.toLowerCase();
      const sportDoc = await admin.firestore().collection("sports").doc(sportId).get();
      if (sportDoc.exists) {
        const sportData = sportDoc.data();
        sportConfig = {
          maxPlayers: sportData?.maxPlayers || 6,
          maxSubstitutes: sportData?.maxSubstitutes || 6,
          genderCategories: sportData?.genderCategories || ['mixed']
        };
      }
    } catch (error) {
      console.error("Error loading sport configuration:", error);
    }

    // Fallback to hardcoded values if sport not found in database
    if (!sportConfig) {
      const fallbackConfig = {
        'Volleyball': { maxPlayers: 6, maxSubstitutes: 6, genderCategories: userProfile.gender === 'F' ? ['women'] : ['men'] },
        'Throwball': { maxPlayers: 7, maxSubstitutes: 2, genderCategories: ['women'] }
      };
      sportConfig = fallbackConfig[teamData.sportName as keyof typeof fallbackConfig] || { maxPlayers: 6, maxSubstitutes: 6, genderCategories: ['mixed'] };
    }

    // Create comprehensive team document
    const teamRef = await admin.firestore().collection("teams").add({
      name: teamData.name,
      description: teamData.description || '',
      captainId: auth.uid,
      captainProfile: {
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        phone: userProfile.phoneNumber,
        panchayat: userProfile.panchayat
      },
      
      // Event & Sport
      eventId: "gramotsavam_2025", // Could be dynamic
      sportId: teamData.sportName.toLowerCase(),
      sportName: teamData.sportName,
      genderCategories: sportConfig.genderCategories,
      
      // Player Requirements
      maxPlayers: sportConfig.maxPlayers,
      maxSubstitutes: sportConfig.maxSubstitutes,
      currentPlayers: 1, // Captain counts as first player
      currentSubstitutes: 0,
      
      // Geographic Info
      panchayat: userProfile.panchayat,
      taluk: userProfile.taluk || "",
      district: userProfile.district,
      state: userProfile.state,
      
      // Status Management
      status: "draft",
      
      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add captain as first player in subcollection
    await admin.firestore()
      .collection("teams").doc(teamRef.id)
      .collection("players").doc(auth.uid)
      .set({
        playerId: auth.uid,
        userId: auth.uid,
        teamId: teamRef.id,
        
        // Player Info
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        phone: userProfile.phoneNumber,
        dateOfBirth: userProfile.dob,
        age: captainAge, // Use the safely calculated age
        gender: userProfile.gender,
        
        // Team Role
        position: "main",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: auth.uid,
        
        // Profile Data
        profileComplete: userProfile.isProfileComplete,
        profileData: {
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          whatsappNumber: userProfile.whatsappNumber,
          village: userProfile.village || "",
          panchayat: userProfile.panchayat,
          taluk: userProfile.taluk || "",
          district: userProfile.district,
          state: userProfile.state,
          pincode: userProfile.pincode || ""
        },
        
        // Document Management
        documents: {
          profilePhoto: {
            url: userProfile.profilePhotoURL || "",
            uploadedBy: auth.uid,
            uploadedAt: userProfile.profilePhotoURL ? admin.firestore.FieldValue.serverTimestamp() : null,
            verified: false
          },
          aadhaarFront: {
            url: userProfile.aadhaarFrontURL || "",
            uploadedBy: auth.uid,
            uploadedAt: userProfile.aadhaarFrontURL ? admin.firestore.FieldValue.serverTimestamp() : null,
            verified: false
          },
          aadhaarBack: {
            url: userProfile.aadhaarBackURL || "",
            uploadedBy: auth.uid,
            uploadedAt: userProfile.aadhaarBackURL ? admin.firestore.FieldValue.serverTimestamp() : null,
            verified: false
          }
        },
        
        // Verification Status
        verificationStatus: "pending"
      });

    // Create initial verification record
    await admin.firestore()
      .collection("teams").doc(teamRef.id)
      .collection("verification").doc("initial")
      .set({
        verificationId: "initial",
        teamId: teamRef.id,
        status: "pending",
        
        checks: {
          samePanchayatVerified: false,
          ageRequirementsVerified: false,
          playerCountVerified: false,
          documentsVerified: false,
          allChecksComplete: false
        },
        
        playersTotal: 1,
        playersVerified: 0,
        playersRejected: 0,
        playersPending: 1,
        
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log(`Enhanced team ${teamRef.id} created successfully`);

    return {
      success: true,
      teamId: teamRef.id,
      message: "Team created successfully"
    };
  } catch (error) {
    console.error("Error creating enhanced team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to create team", {
      originalError: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

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


    // Create player document
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    await admin.firestore()
      .collection("teams").doc(teamId)
      .collection("players").doc(playerId)
      .set({
        playerId: playerId,
        userId: "", // Will be set when user creates account
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
        genderCategories: team.genderCategories
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
