import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/config';
import { UserProfile } from '@/lib/types/auth';
import { sportsService } from './sportsService';
import { Sport } from '@/lib/types/sports';

export interface TeamCreationData {
  name: string;
  description: string;
  sportName: string;
  sportId: string;  // Changed from sport to sportId to match database
  captainId: string;
  panchayat: string;
  district: string;
  state: string;
}

export interface CreateTeamResult {
  success: boolean;
  teamId?: string;
  error?: string;
}

export interface SportEligibilityResult {
  sport: Sport | null;
  eligible: boolean;
  reasons: string[];
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export async function createTeamWithSchema(
  teamData: TeamCreationData, 
  userProfile: UserProfile
): Promise<CreateTeamResult> {
  try {
    // Get sport configuration from database
    const sport = await sportsService.getSportById(teamData.sportId);
    if (!sport) {
      return {
        success: false,
        error: `Sport '${teamData.sportId}' not found`
      };
    }

    // Check if sport is active
    if (sport.status !== 'active') {
      return {
        success: false,
        error: `${sport.name} registration is currently not available`
      };
    }

    // Calculate user age for eligibility check
    const userAge = userProfile.dob ? calculateAge(userProfile.dob) : 25;
    
    // Check eligibility
    const eligibilityCheck = await sportsService.checkEligibility(
      teamData.sportId, 
      userAge, 
      userProfile.gender
    );
    
    if (!eligibilityCheck.eligible) {
      return {
        success: false,
        error: `Eligibility requirements not met: ${eligibilityCheck.reasons.join(', ')}`
      };
    }

    // Use sport configuration from database
    const config = {
      maxPlayers: sport.teamConfig.maxPlayers,
      maxSubstitutes: sport.teamConfig.maxSubstitutes,
      genderCategory: sport.category
    };

    // Create team document
    const teamDocData = {
      name: teamData.name,
      description: teamData.description || '',
      captainId: userProfile.uid,
      captainProfile: {
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        phone: userProfile.phoneNumber,
        panchayat: userProfile.panchayat
      },
      
      // Event & Sport
      eventId: "gramotsavam_2025",
      sportId: sport.sportId,
      sportName: sport.name,
      genderCategory: config.genderCategory,
      sportDisplayName: sport.displayName,
      
      // Player Requirements (from sport config)
      maxPlayers: config.maxPlayers,
      maxSubstitutes: config.maxSubstitutes,
      totalTeamSize: sport.teamConfig.totalTeamSize,
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Create the team
    const teamRef = await addDoc(collection(db, 'teams'), teamDocData);
    const teamId = teamRef.id;

    // Add captain as first player in subcollection
    const playerData = {
      playerId: userProfile.uid,
      userId: userProfile.uid,
      teamId: teamId,
      
      // Player Info
      name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
      phone: userProfile.phoneNumber,
      dateOfBirth: userProfile.dob,
      age: calculateAge(userProfile.dob || ''),
      gender: userProfile.gender,
      
      // Team Role
      position: "main",
      addedAt: serverTimestamp(),
      addedBy: userProfile.uid,
      
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
          url: userProfile.profilePhotoURL || "",
          uploadedBy: userProfile.uid,
          uploadedAt: userProfile.profilePhotoURL ? serverTimestamp() : null,
          verified: false
        },
        aadhaarFront: {
          url: userProfile.aadhaarFrontURL || "",
          uploadedBy: userProfile.uid,
          uploadedAt: userProfile.aadhaarFrontURL ? serverTimestamp() : null,
          verified: false
        },
        aadhaarBack: {
          url: userProfile.aadhaarBackURL || "",
          uploadedBy: userProfile.uid,
          uploadedAt: userProfile.aadhaarBackURL ? serverTimestamp() : null,
          verified: false
        }
      },
      
      // Verification Status
      verificationStatus: "pending"
    };

    // Add player to team's players subcollection
    await addDoc(collection(db, 'teams', teamId, 'players'), playerData);

    // Create initial verification record
    const verificationData = {
      verificationId: "initial",
      teamId: teamId,
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
      
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'teams', teamId, 'verification'), verificationData);

    // Promote user to captain role using Firebase function
    try {
      const promoteFunction = httpsCallable(functions, 'promoteToTeamCaptain');
      await promoteFunction({
        teamId: teamId,
        eventId: "gramotsavam_2025"
      });
      console.log(`User promoted to captain for team ${teamId}`);
    } catch (roleError) {
      console.warn("Team created but role promotion failed:", roleError);
      // Don't fail the team creation if role promotion fails
    }

    return {
      success: true,
      teamId: teamId
    };

  } catch (error: any) {
    console.error('Error creating team:', error);
    return {
      success: false,
      error: error.message || 'Failed to create team. Please try again.'
    };
  }
}

/**
 * Get available sports for team creation based on user profile
 */
export async function getAvailableSportsForUser(userProfile: UserProfile): Promise<Sport[]> {
  try {
    const userAge = userProfile.dob ? calculateAge(userProfile.dob) : 25;
    return await sportsService.getSportsByGender(userProfile.gender);
  } catch (error: any) {
    console.error('Error fetching available sports:', error);
    throw new Error('Failed to fetch available sports');
  }
}

/**
 * Get sport details with eligibility check for a user
 */
export async function getSportWithEligibility(sportId: string, userProfile: UserProfile): Promise<{
  sport: Sport | null;
  eligible: boolean;
  reasons: string[];
}> {
  try {
    const sport = await sportsService.getSportById(sportId);
    if (!sport) {
      return { sport: null, eligible: false, reasons: ['Sport not found'] };
    }

    const userAge = userProfile.dob ? calculateAge(userProfile.dob) : 25;
    const eligibilityCheck = await sportsService.checkEligibility(sportId, userAge, userProfile.gender);
    
    return {
      sport,
      eligible: eligibilityCheck.eligible,
      reasons: eligibilityCheck.reasons
    };
  } catch (error: any) {
    console.error(`Error checking sport eligibility for ${sportId}:`, error);
    return { sport: null, eligible: false, reasons: ['Error checking eligibility'] };
  }
}