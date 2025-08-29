'use server';

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auditLogService } from '@/lib/services/auditLogService';
import { assignTeamToVenue } from '@/lib/actions/admin/teamVenueAssignment';

interface CreateTeamData {
  name: string;
  description: string;
  sport: string;
  captainPhone: string;
  captainDetails?: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'M' | 'F';
  };
  location: {
    panchayat: string;
    district: string;
    state: string;
    taluk?: string;
  };
  createdBy: string;
}

export async function createTeamByVolunteer(data: CreateTeamData) {
  try {
    // Validate required fields
    if (!data.name || !data.sport || !data.captainPhone || !data.createdBy) {
      return {
        success: false,
        message: 'Missing required fields'
      };
    }

    // Check if captain exists; if not, create a bare-minimum user and proceed (no profile completeness required)
    const usersQuery = await adminDb.collection('users')
      .where('phone', '==', data.captainPhone.replace(/\D/g, ''))
      .limit(1)
      .get();

    let captainId: string;
    let captainData: any = {};
    if (usersQuery.empty) {
      // Create a placeholder user
      const newUserRef = adminDb.collection('users').doc();
      captainId = newUserRef.id;
      captainData = {
        uid: captainId,
        phone: data.captainPhone.replace(/\D/g, ''),
        phoneNumber: `+91${data.captainPhone.replace(/\D/g, '')}`,
        firstName: data.captainDetails?.firstName || '',
        lastName: data.captainDetails?.lastName || '',
        dob: data.captainDetails?.dob || '',
        gender: data.captainDetails?.gender || '',
        age: 0,
        panchayat: data.location.panchayat,
        district: data.location.district,
        state: data.location.state,
        taluk: data.location.taluk || '',
        role: 'player',
        isProfileComplete: data.captainDetails ? true : false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        documents: {}
      };
      await newUserRef.set(captainData);
    } else {
      const captainDoc = usersQuery.docs[0];
      captainData = captainDoc.data();
      captainId = captainDoc.id;
      
      // Update user with captain details if provided and missing
      if (data.captainDetails && (!captainData.firstName || !captainData.lastName || !captainData.dob)) {
        const updateData: any = {};
        if (!captainData.firstName && data.captainDetails.firstName) {
          updateData.firstName = data.captainDetails.firstName;
        }
        if (!captainData.lastName && data.captainDetails.lastName) {
          updateData.lastName = data.captainDetails.lastName;
        }
        if (!captainData.dob && data.captainDetails.dob) {
          updateData.dob = data.captainDetails.dob;
        }
        if (!captainData.gender && data.captainDetails.gender) {
          updateData.gender = data.captainDetails.gender;
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = FieldValue.serverTimestamp();
          await adminDb.collection('users').doc(captainId).update(updateData);
          // Update local captainData
          Object.assign(captainData, updateData);
        }
      }
    }

    // Check if captain is from the same location
    if (captainData.panchayat !== data.location.panchayat ||
        captainData.district !== data.location.district ||
        captainData.state !== data.location.state) {
      return {
        success: false,
        message: 'Captain must be from the same panchayat as the team location.'
      };
    }

    // Check if captain is already in another team for this sport
    const existingTeamsQuery = await adminDb.collection('teams')
      .where('sport', '==', data.sport)
      .where('captainId', '==', captainId)
      .where('status', 'in', ['submitted', 'verified', 'checked_in'])
      .limit(1)
      .get();

    if (!existingTeamsQuery.empty) {
      return {
        success: false,
        message: 'Captain is already part of another team for this sport.'
      };
    }

    // Create team document
    const teamRef = adminDb.collection('teams').doc();
    const teamId = teamRef.id;

    const teamData = {
      id: teamId,
      name: data.name,
      description: data.description || '',
      sport: data.sport,
      sportName: data.sport.charAt(0).toUpperCase() + data.sport.slice(1),
      genderCategory: captainData.gender || (data.captainDetails?.gender || ''),
      captainId: captainId,
      captainPhone: data.captainPhone,
      captainProfile: {
        name: `${captainData.firstName || ''} ${captainData.lastName || ''}`.trim() || 'Captain',
        phone: captainData.phone || captainData.phoneNumber || data.captainPhone
      },
      panchayat: data.location.panchayat,
      district: data.location.district,
      state: data.location.state,
      taluk: data.location.taluk || '',
      status: 'checked_in',
      matchDayStatus: 'checked_in',
      playerCount: 1,
      maxPlayers: data.sport === 'volleyball' ? 12 : 12,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: data.createdBy,
      createdByVolunteer: true,
      submittedAt: FieldValue.serverTimestamp()
    };

    // Create player document for captain in team subcollection
    const playerRef = adminDb.collection('teams').doc(teamId).collection('players').doc();
    const playerId = playerRef.id;

    // Calculate age if DOB is available
    let calculatedAge = 0;
    if (captainData.dob) {
      const birthDate = new Date(captainData.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    const playerData = {
      id: playerId,
      userId: captainId,
      teamId: teamId,
      name: `${captainData.firstName || ''} ${captainData.lastName || ''}`.trim() || 'Captain',
      phone: captainData.phone || captainData.phoneNumber || '',
      dob: captainData.dob || '',
      age: calculatedAge,
      gender: captainData.gender || (data.captainDetails?.gender || ''),
      position: 'main' as const,
      isCaptain: true,
      addedAt: FieldValue.serverTimestamp(),
      addedBy: data.createdBy,
      addedByVolunteer: true,
      isProfileComplete: true,
      profileData: {
        firstName: captainData.firstName || '',
        lastName: captainData.lastName || '',
        phone: captainData.phone || captainData.phoneNumber || '',
        dob: captainData.dob || '',
        age: calculatedAge,
        gender: captainData.gender || (data.captainDetails?.gender || ''),
        panchayat: captainData.panchayat || '',
        district: captainData.district || '',
        state: captainData.state || '',
        taluk: captainData.taluk || ''
      },
      documents: captainData.documents || {},
      verificationStatus: 'approved',
      matchDayStatus: 'pending'
    };

    // Use batch write for atomicity
    const batch = adminDb.batch();
    batch.set(teamRef, teamData);
    batch.set(playerRef, playerData);

    // Update user's team association
    const userRef = adminDb.collection('users').doc(captainId);
    batch.update(userRef, {
      [`teams.${data.sport}`]: {
        teamId: teamId,
        teamName: data.name,
        role: 'captain',
        status: 'submitted',
        joinedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Assign team to venue
    try {
      const venueAssignmentResult = await assignTeamToVenue({
        id: teamId,
        name: data.name,
        state: data.location.state,
        district: data.location.district,
        panchayat: data.location.panchayat
      });
      
      console.log('Venue assignment result:', venueAssignmentResult);
    } catch (venueError) {
      console.error('Venue assignment failed:', venueError);
      // Don't fail the main operation if venue assignment fails
    }

    // Log audit trail
    try {
      const volunteerDoc = await adminDb.collection('users').doc(data.createdBy).get();
      const volunteerData = volunteerDoc.data();
      
      if (volunteerData) {
        // Simple audit log without specific team creation method
        console.log('Team created by volunteer:', {
          volunteerId: data.createdBy,
          volunteerName: `${volunteerData.firstName} ${volunteerData.lastName}`.trim(),
          teamId,
          teamName: data.name,
          sport: data.sport,
          captainId,
          captainName: `${captainData.firstName} ${captainData.lastName}`.trim()
        });
      }
    } catch (auditError) {
      // Don't fail the main operation if audit logging fails
      console.error('Audit logging failed:', auditError);
    }

    return {
      success: true,
      message: 'Team created successfully',
      teamId: teamId,
      playerId: playerId
    };

  } catch (error) {
    console.error('Error creating team:', error);
    return {
      success: false,
      message: 'Failed to create team. Please try again.'
    };
  }
}

export async function addPlayerToTeamByVolunteer(teamId: string, playerPhone: string, volunteerId: string) {
  try {
    // Get team data
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        success: false,
        message: 'Team not found'
      };
    }

    const teamData = teamDoc.data()!;

    // Check if team is in a valid state for adding players
    if (!['submitted', 'verified'].includes(teamData.status)) {
      return {
        success: false,
        message: 'Cannot add players to this team in its current status'
      };
    }

    // Find user by phone
    const usersQuery = await adminDb.collection('users')
      .where('phone', '==', playerPhone)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      return {
        success: false,
        message: 'Player phone number not found. The person must have a registered account.'
      };
    }

    const playerDoc = usersQuery.docs[0];
    const playerData = playerDoc.data();
    const playerId = playerDoc.id;

    // Validate player eligibility
    if (!playerData.isProfileComplete) {
      return {
        success: false,
        message: 'Player must have a complete profile to join a team.'
      };
    }

    // Check location match
    if (playerData.panchayat !== teamData.panchayat) {
      return {
        success: false,
        message: 'Player must be from the same panchayat as the team.'
      };
    }

    // Check if player is already in this team
    const existingPlayerQuery = await adminDb.collection('teams')
      .doc(teamId)
      .collection('players')
      .where('userId', '==', playerId)
      .limit(1)
      .get();

    if (!existingPlayerQuery.empty) {
      return {
        success: false,
        message: 'Player is already part of this team.'
      };
    }

    // Check if player is in another team for this sport
    const otherTeamQuery = await adminDb.collection('players')
      .where('userId', '==', playerId)
      .get();

    for (const doc of otherTeamQuery.docs) {
      const otherPlayerData = doc.data();
      const otherTeamDoc = await adminDb.collection('teams').doc(otherPlayerData.teamId).get();
      
      if (otherTeamDoc.exists) {
        const otherTeamData = otherTeamDoc.data()!;
        if (otherTeamData.sport === teamData.sport && 
            ['submitted', 'verified', 'checked_in'].includes(otherTeamData.status)) {
          return {
            success: false,
            message: 'Player is already part of another team for this sport.'
          };
        }
      }
    }

    // Check team capacity
    const currentPlayersQuery = await adminDb.collection('teams')
      .doc(teamId)
      .collection('players')
      .get();

    if (currentPlayersQuery.size >= teamData.maxPlayers) {
      return {
        success: false,
        message: 'Team has reached maximum player capacity.'
      };
    }

    // Create player document in team subcollection
    const newPlayerRef = adminDb.collection('teams').doc(teamId).collection('players').doc();
    const newPlayerId = newPlayerRef.id;

    const newPlayerData = {
      id: newPlayerId,
      userId: playerId,
      teamId: teamId,
      name: `${playerData.firstName} ${playerData.lastName}`.trim(),
      phone: playerData.phone || '',
      dob: playerData.dob || '',
      age: playerData.age || 0,
      gender: playerData.gender || '',
      position: 'main' as const,
      isCaptain: false,
      addedAt: FieldValue.serverTimestamp(),
      addedBy: volunteerId,
      addedByVolunteer: true,
      isProfileComplete: true,
      profileData: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        phone: playerData.phone,
        dob: playerData.dob,
        age: playerData.age,
        gender: playerData.gender,
        panchayat: playerData.panchayat,
        district: playerData.district,
        state: playerData.state
      },
      documents: playerData.documents || {},
      verificationStatus: 'pending',
      matchDayStatus: 'pending'
    };

    // Use batch write
    const batch = adminDb.batch();
    batch.set(newPlayerRef, newPlayerData);

    // Update team player count
    batch.update(adminDb.collection('teams').doc(teamId), {
      playerCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Update user's team association
    batch.update(adminDb.collection('users').doc(playerId), {
      [`teams.${teamData.sport}`]: {
        teamId: teamId,
        teamName: teamData.name,
        role: 'player',
        status: teamData.status,
        joinedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return {
      success: true,
      message: 'Player added to team successfully',
      playerId: newPlayerId
    };

  } catch (error) {
    console.error('Error adding player to team:', error);
    return {
      success: false,
      message: 'Failed to add player to team. Please try again.'
    };
  }
}
