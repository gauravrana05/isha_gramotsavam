'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createTeamAndPromoteCaptain } from '@/lib/actions/captain/createTeamOptimized';

interface CreateTeamForVolunteerRequest {
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
  captainEmail: string;
}

export async function createTeamForVolunteer(request: CreateTeamForVolunteerRequest) {
  try {
    const { teamData, captainEmail } = request;

    // Find user by email
    const usersQuery = adminDb.collection('users').where('email', '==', captainEmail.toLowerCase().trim());
    const usersSnapshot = await usersQuery.get();

    if (usersSnapshot.empty) {
      return {
        success: false,
        error: 'User not found with this email address. Please ensure the captain has registered on the platform.'
      };
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if user profile is complete
    if (!userData.isProfileComplete) {
      return {
        success: false,
        error: 'Captain must complete their profile before becoming a team captain.'
      };
    }

    // Check if user is from the same location as team
    if (
      userData.panchayat !== teamData.panchayat ||
      userData.district !== teamData.district ||
      userData.state !== teamData.state
    ) {
      return {
        success: false,
        error: 'Captain must be from the same panchayat as the team location.'
      };
    }

    // Check gender compatibility for restricted sports
    if (teamData.genderCategory === 'F' && userData.gender !== 'F') {
      return {
        success: false,
        error: 'This sport requires a female captain.'
      };
    }

    // Check if user is already a captain of another team for the same sport
    const existingTeamsQuery = adminDb.collection('teams')
      .where('captainId', '==', userId)
      .where('sportId', '==', teamData.sportId);
    
    const existingTeamsSnapshot = await existingTeamsQuery.get();
    
    if (!existingTeamsSnapshot.empty) {
      const existingTeam = existingTeamsSnapshot.docs[0].data();
      return {
        success: false,
        error: `This user is already a captain of team "${existingTeam.name}" for ${teamData.sportName}.`
      };
    }

    // Create team using existing function
    const result = await createTeamAndPromoteCaptain({
      teamData,
      captainId: userId
    });

    // If team creation was successful, immediately submit it
    if (result.success && result.teamId) {
      try {
        // Import submitTeamForVerification function
        const { submitTeamForVerification } = await import('@/lib/actions/captain/submitTeam');
        
        // Submit the team immediately
        await submitTeamForVerification({
          teamId: result.teamId,
          captainId: userId,
          validation: {
            playerCount: 1,
            requiredPlayers: 1,
            documentsComplete: true,
            sportGenderCategory: teamData.genderCategory
          }
        });
      } catch (error) {
        console.error('Error submitting team after creation:', error);
        // Don't fail the creation, just log the error
      }
    }

    return result;

  } catch (error) {
    console.error('Error creating team for volunteer:', error);
    return {
      success: false,
      error: 'Failed to create team. Please try again.'
    };
  }
}