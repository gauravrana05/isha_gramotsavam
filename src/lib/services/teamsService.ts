import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/config';
import { UserProfile } from '@/lib/types/auth';

export interface TeamCreationData {
  name: string;
  description: string;
  sportName: string;
  sport: 'volleyball' | 'throwball';
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
    // Validate gender for throwball
    if (teamData.sportName === 'Throwball' && userProfile.gender !== 'F') {
      return {
        success: false,
        error: 'Throwball registration is only available for women'
      };
    }

    // Set sport-specific requirements
    const sportConfig = {
      'Volleyball': { 
        maxPlayers: 6, 
        maxSubstitutes: 6, 
        genderCategory: userProfile.gender === 'F' ? 'women' : 'men' 
      },
      'Throwball': { 
        maxPlayers: 7, 
        maxSubstitutes: 2, 
        genderCategory: 'women' 
      }
    };

    const config = sportConfig[teamData.sportName as keyof typeof sportConfig];

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
      sportId: teamData.sportName.toLowerCase(),
      sportName: teamData.sportName,
      genderCategory: config.genderCategory,
      
      // Player Requirements
      maxPlayers: config.maxPlayers,
      maxSubstitutes: config.maxSubstitutes,
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