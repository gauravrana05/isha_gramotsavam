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
  volunteerId: string;
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

export async function volunteerAddPlayerToTeam({ teamId, playerData, volunteerId }: AddPlayerRequest) {
  try {
    // Validate volunteer permissions
    const volunteerDoc = await adminDb.collection('users').doc(volunteerId).get();
    if (!volunteerDoc.exists) {
      return { success: false, error: { code: 'unauthenticated', message: 'Volunteer not found' } };
    }
    const volunteer = volunteerDoc.data();
    if (!volunteer || !['technical_volunteer', 'admin'].includes(volunteer.role)) {
      return { success: false, error: { code: 'permission-denied', message: 'Not authorized to add players' } };
    }

    // Validate team
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: { code: 'team-not-found', message: 'Team not found' } };
    }
    const team = teamDoc.data()!;

    // Validate required fields
    if (!playerData.phone || !playerData.firstName || !playerData.lastName || !playerData.dateOfBirth || !teamId) {
      return { success: false, error: { code: 'invalid-argument', message: 'Missing required player information' } };
    }

    // Validate player age
    const playerAge = calculateAge(playerData.dateOfBirth);
    if (playerAge === null || playerAge < 14 || playerAge > 60) {
      return { success: false, error: { code: 'invalid-age', message: 'Player age must be between 14 and 60' } };
    }

    // Normalize phone
    let cleanPhone = playerData.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('911')) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (cleanPhone.length !== 10) {
      return { success: false, error: { code: 'invalid-phone', message: `Invalid phone number: Expected 10 digits, got ${cleanPhone.length}` } };
    }
    const formattedPhone = `+91${cleanPhone}`;

    // Check duplicate in this team
    const alreadyInTeam = await checkPlayerExistsInTeam(cleanPhone, teamId);
    if (alreadyInTeam) {
      return { success: false, error: { code: 'player-exists', message: 'Player already exists in this team' } };
    }

    // Resolve or create Auth user
    let userId: string;
    let existingUser = false;

    const defaultDocuments = {
      profilePhoto: { storagePath: '', url: null, verified: false, uploadedAt: null, uploadedBy: null },
      aadhaarFront: { storagePath: '', url: null, verified: false, uploadedAt: null, uploadedBy: null },
      aadhaarBack: { storagePath: '', url: null, verified: false, uploadedAt: null, uploadedBy: null },
    };

    try {
      const existingAuthUser = await adminAuth.getUserByPhoneNumber(formattedPhone);
      userId = existingAuthUser.uid;
      existingUser = true;

      const userDoc = await adminDb.collection('users').doc(userId).get();
      const existingUserData = userDoc.exists ? userDoc.data() : {};
      const updateData: any = {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        phoneNumber: cleanPhone,
        whatsappNumber: playerData.whatsappNumber || cleanPhone,
        dob: playerData.dateOfBirth,
        gender: playerData.gender,
        village: playerData.village,
        panchayat: playerData.panchayat || team.panchayat,
        taluk: playerData.taluk || team.taluk,
        district: playerData.district || team.district,
        state: playerData.state || team.state,
        pincode: playerData.pincode || '',
        isProfileComplete: existingUserData?.isProfileComplete || false,
        currentTeamId: teamId,
        updatedAt: FieldValue.serverTimestamp(),
        role: existingUserData?.role || 'player',
        documents: existingUserData?.documents || defaultDocuments,
      };
      await adminDb.collection('users').doc(userId).set(updateData, { merge: true });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const userRecord = await adminAuth.createUser({ phoneNumber: formattedPhone, displayName: playerData.name, disabled: false });
        userId = userRecord.uid;
        await adminDb.collection('users').doc(userId).set({
          uid: userId,
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          phoneNumber: cleanPhone,
          whatsappNumber: playerData.whatsappNumber || cleanPhone,
          dob: playerData.dateOfBirth,
          gender: playerData.gender,
          village: playerData.village,
          panchayat: playerData.panchayat || team.panchayat,
          taluk: playerData.taluk || team.taluk,
          district: playerData.district || team.district,
          state: playerData.state || team.state,
          pincode: playerData.pincode || '',
          role: 'player',
          isProfileComplete: false,
          currentTeamId: teamId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          documents: defaultDocuments,
        });
      } else {
        return { success: false, error: { code: 'internal', message: 'Error checking/creating user' } };
      }
    }

    // Add player to team with status approved (volunteer override)
    await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb.collection('teams').doc(teamId).collection('players').doc(userId);
      const teamRef = adminDb.collection('teams').doc(teamId);

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
        addedBy: volunteerId,
        isProfileComplete: userData?.isProfileComplete || false,
        profileData: {
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          whatsappNumber: playerData.whatsappNumber || cleanPhone,
          village: playerData.village,
          panchayat: playerData.panchayat || team.panchayat,
          taluk: playerData.taluk || team.taluk,
          district: playerData.district || team.district,
          state: playerData.state || team.state,
          pincode: playerData.pincode || '',
        },
        documents: userData?.documents || defaultDocuments,
        verificationStatus: 'approved',
        verifiedBy: volunteerId,
        verifiedAt: FieldValue.serverTimestamp(),
        verificationComments: 'Approved by volunteer during add',
        isDeleted: false,
      });

      const currentCount = team.currentPlayers || 0;
      const currentSubs = team.currentSubstitutes || 0;
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
      message: existingUser ? 'Existing user linked and approved' : 'New user created, added and approved',
    };
  } catch (error) {
    return { success: false, error: { code: 'internal', message: error instanceof Error ? error.message : 'Failed to add player' } };
  }
}


