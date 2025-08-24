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
    .collection('teams')
    .doc(teamId)
    .collection('players')
    .where('phone', '==', phone)
    .where('isDeleted', '==', false)
    .get();
  return !playersSnapshot.empty;
}

export async function addPlayerToTeam({ teamId, playerData, captainId }: AddPlayerRequest) {
  try {
    // Validate captain authentication
    const currentUser = await adminAuth.getUser(captainId);
    if (!currentUser) {
      return { success: false, error: { code: 'unauthenticated', message: 'User must be authenticated' } };
    }

    // Validate team
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: { code: 'team-not-found', message: 'Team not found' } };
    }

    const teamData = teamDoc.data()!;
    if (teamData.captainId !== captainId) {
      return { success: false, error: { code: 'permission-denied', message: 'Only team captain can add players' } };
    }

    // Validate required fields
    if (!playerData.phone || !playerData.firstName || !playerData.lastName || !playerData.dateOfBirth || !teamId) {
      return { success: false, error: { code: 'invalid-argument', message: 'Missing required player information' } };
    }

    // Validate player age
    const playerAge = calculateAge(playerData.dateOfBirth);
    if (playerAge === null || playerAge < 14 || playerAge > 60) {
      return { success: false, error: { code: 'invalid-age', message: 'Player age must be between 14 and 60' } };
    }

    // Validate phone number
    let cleanPhone = playerData.phone.replace(/\D/g, ''); // Remove all non-digits first
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2); // Remove country code
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('911')) {
      cleanPhone = cleanPhone.substring(3); // Remove 911 prefix
    }
    
    if (cleanPhone.length !== 10) {
      return { success: false, error: { code: 'invalid-phone', message: `Invalid phone number: Expected 10 digits, got ${cleanPhone.length} (${cleanPhone})` } };
    }
    const formattedPhone = `+91${cleanPhone}`;

    // Check if player exists in team
    const playerExists = await checkPlayerExistsInTeam(cleanPhone, teamId);
    if (playerExists) {
      return { success: false, error: { code: 'player-exists', message: 'Player already exists in this team' } };
    }

    let userId: string;
    let existingUser = false;

    // Default documents structure for new users
    const defaultDocuments = {
      profilePhoto: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
      aadhaarFront: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
      aadhaarBack: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
    };

    // Check if user exists in Firebase Authentication
    try {
      const existingAuthUser = await adminAuth.getUserByPhoneNumber(formattedPhone);
      userId = existingAuthUser.uid;
      existingUser = true;

      // Prevent captain from adding themselves as a player
      if (userId === captainId) {
        return { 
          success: false, 
          error: { 
            code: 'captain-self-add', 
            message: 'Captain cannot add themselves as a player. You are already part of the team as captain.' 
          } 
        };
      }

      // Fetch existing user profile to preserve documents
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const existingUserData = userDoc.exists ? userDoc.data() : {};

      // Update user profile, preserving existing documents and role
      const updateData: any = {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        phoneNumber: cleanPhone,
        whatsappNumber: playerData.whatsappNumber || cleanPhone,
        dob: playerData.dateOfBirth,
        gender: playerData.gender,
        village: playerData.village,
        panchayat: playerData.panchayat || teamData.panchayat,
        taluk: playerData.taluk || teamData.taluk,
        district: playerData.district || teamData.district,
        state: playerData.state || teamData.state,
        pincode: playerData.pincode || '',
        isProfileComplete: existingUserData?.isProfileComplete || false,
        currentTeamId: teamId,
        updatedAt: FieldValue.serverTimestamp(),
        documents: existingUserData?.documents || defaultDocuments,
      };

      // Preserve captain role if user is the team captain
      if (userId !== captainId) {
        updateData.role = 'player';
      }

      await adminDb.collection('users').doc(userId).set(updateData, { merge: true });

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        const userRecord = await adminAuth.createUser({
          phoneNumber: formattedPhone,
          displayName: playerData.name,
          disabled: false,
        });
        userId = userRecord.uid;

        // Additional check: ensure captain doesn't accidentally create duplicate account
        if (userId === captainId) {
          return { 
            success: false, 
            error: { 
              code: 'captain-self-add', 
              message: 'Captain cannot add themselves as a player. You are already part of the team as captain.' 
            } 
          };
        }

        // Create new user profile
        await adminDb.collection('users').doc(userId).set({
          uid: userId,
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          phoneNumber: cleanPhone,
          whatsappNumber: playerData.whatsappNumber || cleanPhone,
          dob: playerData.dateOfBirth,
          gender: playerData.gender,
          village: playerData.village,
          panchayat: playerData.panchayat || teamData.panchayat,
          taluk: playerData.taluk || teamData.taluk,
          district: playerData.district || teamData.district,
          state: playerData.state || teamData.state,
          pincode: playerData.pincode || '',
          role: 'player',
          isProfileComplete: false,
          currentTeamId: teamId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          documents: defaultDocuments,
        });

      } else {
        return { success: false, error: { code: 'internal', message: 'Error checking existing user' } };
      }
    }

    // Add player to team subcollection and update counts
    await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb.collection('teams').doc(teamId).collection('players').doc(userId);
      const teamRef = adminDb.collection('teams').doc(teamId);

      // Fetch user profile to get documents
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

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
          panchayat: playerData.panchayat || teamData.panchayat,
          taluk: playerData.taluk || teamData.taluk,
          district: playerData.district || teamData.district,
          state: playerData.state || teamData.state,
          pincode: playerData.pincode || '',
        },
        documents: userData?.documents || defaultDocuments,
        verificationStatus: userData?.verificationStatus || 'pending',
        isDeleted: false,
      });

      const currentCount = teamData.currentPlayers || 0;
      const currentSubs = teamData.currentSubstitutes || 0;
      transaction.update(teamRef, {
        currentPlayers: playerData.position === 'main' ? currentCount + 1 : currentCount,
        currentSubstitutes: playerData.position === 'substitute' ? currentSubs + 1 : currentSubs,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });


    return {
      success: true,
      playerId: userId,
      existed: existingUser,
      message: existingUser ? 'Existing user linked to team' : 'New user created and added to team',
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'internal',
        message: error instanceof Error ? error.message : 'Failed to add player to team',
      },
    };
  }
}