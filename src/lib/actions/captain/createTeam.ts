'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TeamData {
  name: string;
  description?: string;
  sportId: string;
  sportName: string;
  genderCategory?: string;
}

interface CreateTeamRequest {
  teamData: TeamData;
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
    const teamsQuery = await adminDb
      .collection("teams")
      .where("eventId", "==", eventId)
      .get();

    for (const teamDoc of teamsQuery.docs) {
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

export async function createTeamWithCompleteSchema(request: CreateTeamRequest) {
  try {
    const { teamData, captainId } = request;
    
    // Validate required fields
    if (!teamData.name || !teamData.sportName) {
      return { success: false, error: "Missing required team data: name and sport are required" };
    }

    // Get user profile for captain details
    const userDoc = await adminDb.collection("users").doc(captainId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User profile not found" };
    }

    const userProfile = userDoc.data();
    if (!userProfile) {
      return { success: false, error: "User profile data not found" };
    }
    
    // Calculate captain age safely
    const captainAge = calculateAge(userProfile.dob);

    // Validate gender-sport eligibility
    if (teamData.sportName === 'Throwball' && userProfile.gender !== 'F') {
      return { success: false, error: "Throwball is only for women" };
    }

    // Check if user is already captain or player in another team for this event
    const eventId = "gramotsavam_2025";
    const userExistsCheck = await checkPlayerExistsInEvent(captainId, eventId, 'userId');
    if (userExistsCheck.exists) {
      return { 
        success: false, 
        error: `You are already registered in team "${userExistsCheck.teamName}" for this event. Each player can only join one team per event.`
      };
    }

    // Also check by phone number
    if (userProfile.phoneNumber) {
      const phoneExistsCheck = await checkPlayerExistsInEvent(userProfile.phoneNumber, eventId, 'phone');
      if (phoneExistsCheck.exists) {
        return { 
          success: false, 
          error: `A player with your phone number is already registered in team "${phoneExistsCheck.teamName}" for this event. Each player can only join one team per event.`
        };
      }
    }

    // Load sport configuration from database
    let sportConfig = null;
    try {
      const sportId = teamData.sportId || teamData.sportName.toLowerCase();
      const sportDoc = await adminDb.collection("sports").doc(sportId).get();
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
    const teamRef = await adminDb.collection("teams").add({
      name: teamData.name,
      description: teamData.description || '',
      captainId: captainId,
      captainProfile: {
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        phone: userProfile.phoneNumber,
        panchayat: userProfile.panchayat
      },
      
      // Event & Sport
      eventId: eventId,
      sportId: teamData.sportId || teamData.sportName.toLowerCase(),
      sportName: teamData.sportName,
      genderCategory: teamData.genderCategory || sportConfig.genderCategories[0] || 'mixed',
      
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Add captain as first player in subcollection
    await adminDb
      .collection("teams").doc(teamRef.id)
      .collection("players").doc(captainId)
      .set({
        playerId: captainId,
        userId: captainId,
        teamId: teamRef.id,
        
        // Player Info
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        phone: userProfile.phoneNumber,
        dateOfBirth: userProfile.dob,
        age: captainAge,
        gender: userProfile.gender,
        
        // Team Role
        position: "main",
        addedAt: FieldValue.serverTimestamp(),
        addedBy: captainId,
        
        // Profile Data
        profileComplete: userProfile.isProfileComplete || false,
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
            storagePath: userProfile.documents?.profilePhoto?.storagePath || "",
            url: userProfile.documents?.profilePhoto?.url || null,
            verified: userProfile.documents?.profilePhoto?.verified || false,
            uploadedBy: captainId,
            uploadedAt: userProfile.documents?.profilePhoto?.uploadedAt || null
          },
          aadhaarFront: {
            storagePath: userProfile.documents?.aadhaarFront?.storagePath || "",
            url: userProfile.documents?.aadhaarFront?.url || null,
            verified: userProfile.documents?.aadhaarFront?.verified || false,
            uploadedBy: captainId,
            uploadedAt: userProfile.documents?.aadhaarFront?.uploadedAt || null
          },
          aadhaarBack: {
            storagePath: userProfile.documents?.aadhaarBack?.storagePath || "",
            url: userProfile.documents?.aadhaarBack?.url || null,
            verified: userProfile.documents?.aadhaarBack?.verified || false,
            uploadedBy: captainId,
            uploadedAt: userProfile.documents?.aadhaarBack?.uploadedAt || null
          }
        },
        
        // Verification Status
        verificationStatus: "pending"
      });

    // Create initial verification record
    await adminDb
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
        
        createdAt: FieldValue.serverTimestamp()
      });

    console.log(`Enhanced team ${teamRef.id} created successfully`);

    return {
      success: true,
      teamId: teamRef.id,
      message: "Team created successfully"
    };
  } catch (error) {
    console.error("Error creating enhanced team:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create team"
    };
  }
}