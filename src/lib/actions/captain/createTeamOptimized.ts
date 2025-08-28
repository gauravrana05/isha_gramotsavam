"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { assignTeamToVenue } from "@/lib/actions/admin/teamVenueAssignment";

interface CreateTeamRequest {
  teamData: {
    name: string;
    sportName: string;
    sportId: string;
    description?: string;
    panchayat: string;
    district: string;
    state: string;
    genderCategory: string;
  };
  captainId: string;
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();

  if (isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

async function checkPlayerExistsInEvent(
  playerIdentifier: string,
  eventId?: string,
  identifierType: "userId" | "phone" = "userId"
): Promise<{ exists: boolean; teamId?: string; teamName?: string }> {
  try {
    const teamsRef = adminDb.collection("teams");
    const query = teamsRef
      .where(identifierType === "userId" ? "captainId" : "captainProfile.phone", "==", playerIdentifier);

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
    return { exists: false };
  }
}

export async function createTeamAndPromoteCaptain(request: CreateTeamRequest) {
  try {
    const { teamData, captainId } = request;

    // Validate required fields
    if (!teamData.name || !teamData.sportName) {
      return { success: false, error: "Missing required team data: name and sport are required" };
    }

    const userDoc = await adminDb.collection("users").doc(captainId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User profile not found" };
    }

    const userProfile = userDoc.data();
    if (!userProfile?.firstName || !userProfile?.gender || !userProfile?.dob) {
      return { success: false, error: "Incomplete user profile. Please update your profile before creating a team." };
    }

    // Age & eligibility
    const captainAge = calculateAge(userProfile.dob);
    if (teamData.sportName === "Throwball" && userProfile.gender !== "F") {
      return { success: false, error: "Throwball is only for women" };
    }

    // Duplicate check by userId & phone
    const existingUser = await checkPlayerExistsInEvent(captainId, undefined, "userId");
    if (existingUser.exists) {
      return {
        success: false,
        error: `You are already registered in team "${existingUser.teamName}".`,
      };
    }

    if (userProfile.phoneNumber) {
      const existingPhone = await checkPlayerExistsInEvent(userProfile.phoneNumber, undefined, "phone");
      if (existingPhone.exists) {
        return {
          success: false,
          error: `A player with your phone number is already registered in team "${existingPhone.teamName}".`,
        };
      }
    }

    // Load or fallback sport config
    let sportConfig = null;
    try {
      const sportId = teamData.sportId || teamData.sportName.toLowerCase();
      const sportDoc = await adminDb.collection("sports").doc(sportId).get();
      sportConfig = sportDoc.exists ? sportDoc.data() : null;
    } catch (err) {
      // Sport config load failed - will use fallback
    }

    if (!sportConfig) {
      const fallback = {
        maxPlayers: 6,
        maxSubstitutes: 3,
        genderCategories: userProfile.gender === "F" ? ["women"] : ["men"],
      };
      sportConfig = fallback;
    }

    // Create team
    const teamRef = adminDb.collection("teams").doc();
    const teamId = teamRef.id;

    const teamPayload = {
      name: teamData.name,
      description: teamData.description || "",
      captainId: captainId,
      captainProfile: {
        name: `${userProfile.firstName} ${userProfile.lastName || ""}`.trim(),
        phone: userProfile.phoneNumber,
        panchayat: userProfile.panchayat,
      },
      sportId: teamData.sportId || teamData.sportName.toLowerCase(),
      sportName: teamData.sportName,
      genderCategory: teamData.genderCategory || sportConfig.genderCategories[0] || "mixed",
      maxPlayers: sportConfig.maxPlayers,
      maxSubstitutes: sportConfig.maxSubstitutes,
      currentPlayers: 1,
      currentSubstitutes: 0,
      pincode: userProfile.pincode,
      panchayat: userProfile.panchayat,
      taluk: userProfile.taluk || "",
      district: userProfile.district,
      state: userProfile.state,
      status: "draft",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await teamRef.set(teamPayload);

    // Add captain as player
    await teamRef.collection("players").doc(captainId).set({
      userId: captainId,
      teamId,
      name: `${userProfile.firstName} ${userProfile.lastName || ""}`.trim(),
      phone: userProfile.phoneNumber,
      dateOfBirth: userProfile.dob,
      age: captainAge,
      gender: userProfile.gender,
      position: "main",
      addedAt: FieldValue.serverTimestamp(),
      addedBy: captainId,
      isProfileComplete: userProfile.isProfileComplete || false,
      profileData: {
        firstName: userProfile.firstName,
        lastName: userProfile.lastName || "",
        whatsappNumber: userProfile.whatsappNumber || "",
        village: userProfile.village || "",
        panchayat: userProfile.panchayat,
        taluk: userProfile.taluk || "",
        district: userProfile.district,
        state: userProfile.state,
        pincode: userProfile.pincode || "",
      },
      documents: {
        profilePhoto: {
          storagePath: userProfile.documents?.profilePhoto?.storagePath || "",
          url: userProfile.documents?.profilePhoto?.url || null,
          verified: userProfile.documents?.profilePhoto?.verified || false,
          uploadedBy: captainId,
          uploadedAt: userProfile.documents?.profilePhoto?.uploadedAt || null,
        },
        aadhaarFront: {
          storagePath: userProfile.documents?.aadhaarFront?.storagePath || "",
          url: userProfile.documents?.aadhaarFront?.url || null,
          verified: userProfile.documents?.aadhaarFront?.verified || false,
          uploadedBy: captainId,
          uploadedAt: userProfile.documents?.aadhaarFront?.uploadedAt || null,
        },
        aadhaarBack: {
          storagePath: userProfile.documents?.aadhaarBack?.storagePath || "",
          url: userProfile.documents?.aadhaarBack?.url || null,
          verified: userProfile.documents?.aadhaarBack?.verified || false,
          uploadedBy: captainId,
          uploadedAt: userProfile.documents?.aadhaarBack?.uploadedAt || null,
        },
      },
      verificationStatus: "pending",
    });

    // Add initial verification record
    await teamRef.collection("verification").doc("initial").set({
      verificationId: "initial",
      teamId,
      status: "pending",
      checks: {
        samePanchayatVerified: false,
        ageRequirementsVerified: false,
        playerCountVerified: false,
        documentsVerified: false,
        allChecksComplete: false,
      },
      playersTotal: 1,
      playersVerified: 0,
      playersRejected: 0,
      playersPending: 1,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Promote to captain role
    await promoteUserToCaptain(captainId, teamId);

    // Assign team to venue immediately after creation
    try {
      const teamForVenueAssignment = {
        id: teamId,
        name: teamData.name,
        state: teamData.state,
        district: teamData.district,
        panchayat: teamData.panchayat
      };

      const venueAssignmentResult = await assignTeamToVenue(teamForVenueAssignment);
      
      // Log venue assignment result but don't fail team creation if venue assignment fails
      console.log('Venue assignment result:', venueAssignmentResult);
    } catch (venueError) {
      console.error('Venue assignment failed during team creation:', venueError);
      // Continue with team creation even if venue assignment fails
      // Team will be queued for manual assignment
    }

    // Revalidate captain views
    revalidatePath("/captain/teams");
    revalidatePath("/captain/dashboard");

    return {
      success: true,
      teamId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create team. Please try again.",
    };
  }
}

// Simplified role promotion - much faster than the complex cloud function
export async function promoteUserToCaptain(userId: string, teamId: string, eventId?: string) {
  try {
    // Simple role update - just update the role field in users collection
    await adminDb.collection("users").doc(userId).update({
      role: "captain",
      teamId: teamId,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Create simple captain access record (optional - for permissions)
    await adminDb.collection("userRoles").doc(userId).set({
      userId: userId,
      role: "captain",
      teamId: teamId,
      permissions: ["manage_team", "add_players", "edit_team", "view_matches"],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to promote user to captain: ${error.message}`);
  }
} 