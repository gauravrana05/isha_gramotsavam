'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auditLogService } from '@/lib/services/auditLogService';

interface CreateTeamData {
  name: string;
  description: string;
  sport: string;
  captainPhone: string;
  location: {
    panchayat: string;
    district: string;
    state: string;
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

    // Check if captain exists and has complete profile
    const usersQuery = await adminDb.collection('users')
      .where('phone', '==', data.captainPhone)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      return {
        success: false,
        message: 'Captain phone number not found. The person must have a registered account.'
      };
    }

    const captainDoc = usersQuery.docs[0];
    const captainData = captainDoc.data();
    const captainId = captainDoc.id;

    // Check if captain has complete profile
    if (!captainData.isProfileComplete) {
      return {
        success: false,
        message: 'Captain must have a complete profile to create a team.'
      };
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
      captainId: captainId,
      captainPhone: data.captainPhone,
      panchayat: data.location.panchayat,
      district: data.location.district,
      state: data.location.state,
      status: 'submitted',
      matchDayStatus: 'pending',
      playerCount: 1,
      maxPlayers: data.sport === 'volleyball' ? 12 : 12,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: data.createdBy,
      createdByVolunteer: true,
      submittedAt: FieldValue.serverTimestamp()
    };

    // Create player document for captain
    const playerRef = adminDb.collection('players').doc();
    const playerId = playerRef.id;

    const playerData = {
      id: playerId,
      userId: captainId,
      teamId: teamId,
      name: `${captainData.firstName} ${captainData.lastName}`.trim(),
      phone: captainData.phone || '',
      dob: captainData.dob || '',
      age: captainData.age || 0,
      gender: captainData.gender || '',
      position: 'main' as const,
      isCaptain: true,
      addedAt: FieldValue.serverTimestamp(),
      addedBy: data.createdBy,
      addedByVolunteer: true,
      isProfileComplete: true,
      profileData: {
        firstName: captainData.firstName,
        lastName: captainData.lastName,
        phone: captainData.phone,
        dob: captainData.dob,
        age: captainData.age,
        gender: captainData.gender,
        panchayat: captainData.panchayat,
        district: captainData.district,
        state: captainData.state
      },
      documents: captainData.documents || {},
      verificationStatus: 'pending',
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
    const existingPlayerQuery = await adminDb.collection('players')
      .where('teamId', '==', teamId)
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
    const currentPlayersQuery = await adminDb.collection('players')
      .where('teamId', '==', teamId)
      .get();

    if (currentPlayersQuery.size >= teamData.maxPlayers) {
      return {
        success: false,
        message: 'Team has reached maximum player capacity.'
      };
    }

    // Create player document
    const newPlayerRef = adminDb.collection('players').doc();
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
