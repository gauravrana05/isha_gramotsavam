'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function createTestTeams(venueId: string, count: number = 25) {
  try {
    // Console log removed
    
    const batch = adminDb.batch();
    const teamIds: string[] = [];
    
    const sports = ['volleyball'];
    const genders = ['men'] as const;
    const districts = ['Coimbatore'];
    const taluks = ['North', 'South', 'East', 'West', 'Central'];
    
    for (let i = 1; i <= count; i++) {
      const sport = sports[0];
      const gender = genders[0];
      const district = districts[0];
      const taluk = taluks[1];
      
      // Create team document
      const teamRef = adminDb.collection('teams').doc();
      const teamId = teamRef.id;
      teamIds.push(teamId);
      
      const teamData = {
        name: `Test Team ${i.toString().padStart(2, '0')}`,
        description: `Test team for fixture management - ${sport} ${gender}`,
        captainId: `test_captain_${i}`,
        captainProfile: {
          name: `Captain ${i}`,
          phone: `+91900000${i.toString().padStart(4, '0')}`,
          email: `captain${i}@test.com`
        },
        eventId: 'isha_gramotsavam_2025',
        sportId: sport,
        sportName: sport.charAt(0).toUpperCase() + sport.slice(1),
        genderCategory: gender,
        maxPlayers: 11,
        maxSubstitutes: 5,
        currentPlayers: 11,
        currentSubstitutes: 3,
        panchayat: `Test Panchayat ${i}`,
        taluk: taluk,
        district: district,
        state: 'Tamil Nadu',
        status: 'verified',
        matchDayStatus: 'checked_in',
        checkedIn: true,
        checkedInVenue: venueId,
        checkedInAt: FieldValue.serverTimestamp(),
        checkedInBy: 'test_system',
        autoCheckedIn: true,
        tournamentNumber: i,
        createdAt: FieldValue.serverTimestamp(),
        submittedAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: 'test_admin',
        updatedAt: FieldValue.serverTimestamp()
      };
      
      batch.set(teamRef, teamData);
      
      // Create test players for this team
      for (let j = 1; j <= 11; j++) {
        const playerRef = adminDb.collection('teams').doc(teamId).collection('players').doc();
        const playerData = {
          userId: `test_user_${i}_${j}`,
          firstName: `Player${j}`,
          lastName: `Team${i}`,
          email: `player${j}.team${i}@test.com`,
          phone: `+919000${i.toString().padStart(2, '0')}${j.toString().padStart(2, '0')}`,
          position: j <= 11 ? 'main' : 'substitute',
          jerseyNumber: j,
          addedAt: FieldValue.serverTimestamp(),
          addedBy: `test_captain_${i}`,
          verificationStatus: 'verified',
          verifiedAt: FieldValue.serverTimestamp(),
          verifiedBy: 'test_admin',
          isDeleted: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        
        batch.set(playerRef, playerData);
      }
      
      // Create team venue assignment
      const assignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
      const assignmentData = {
        teamId,
        eventId: 'isha_gramotsavam_2025',
        venueId: venueId,
        teamLocation: {
          panchayat: `Test Panchayat ${i}`,
          taluk: taluk,
          district: district,
          state: 'Tamil Nadu'
        },
        currentLevel: 'cluster',
        clusterVenueId: venueId,
        clusterVenueName: `Test Venue ${venueId}`,
        assignmentMethod: 'auto_assigned',
        assignedBy: 'test_system',
        assignedAt: FieldValue.serverTimestamp(),
        clusterQualified: false,
        divisionQualified: false,
        finalQualified: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      batch.set(assignmentRef, assignmentData);
    }
    
    await batch.commit();
    
    // Console log removed
    return {
      success: true,
      message: `Created ${count} test teams`,
      teamIds
    };
    
  } catch (error) {
    // Error handling removed
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteTestTeams(venueId: string) {
  try {
    // Console log removed
    
    // Get all teams assigned to this venue that were created by test system
    const assignmentsSnapshot = await adminDb.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('assignedBy', '==', 'test_system')
      .get();
    
    if (assignmentsSnapshot.empty) {
      // Console log removed
      return {
        success: true,
        message: 'No test teams found to delete',
        deletedCount: 0
      };
    }
    
    const teamIds = assignmentsSnapshot.docs.map(doc => doc.data().teamId);
    // Console log removed
    
    // Delete in batches (Firestore limit is 500 operations per batch)
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchTeamIds = teamIds.slice(i, i + batchSize);
      
      for (const teamId of batchTeamIds) {
        // Delete team document
        const teamRef = adminDb.collection('teams').doc(teamId);
        batch.delete(teamRef);
        
        // Delete team venue assignment
        const assignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
        batch.delete(assignmentRef);
        
        deletedCount++;
      }
      
      await batch.commit();
      // Deleted batch with teams
    }
    
    // Also clean up any fixtures created with test teams
    await deleteTestFixtures(venueId);
    
    // Clean up any test matches
    await deleteTestMatches(venueId);
    
    // Console log removed
    return {
      success: true,
      message: `Deleted ${deletedCount} test teams and related data`,
      deletedCount
    };
    
  } catch (error) {
    // Error handling removed
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function deleteTestFixtures(venueId: string) {
  try {
    // Get all fixtures for this venue
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .get();
    
    if (!fixturesSnapshot.empty) {
      const batch = adminDb.batch();
      
      fixturesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      // Console log removed
    }
    
  } catch (error) {
    // Error handling removed
  }
}

async function deleteTestMatches(venueId: string) {
  try {
    // Get all matches for this venue
    const matchesSnapshot = await adminDb.collection('matches')
      .where('venueId', '==', venueId)
      .get();
    
    if (!matchesSnapshot.empty) {
      const batch = adminDb.batch();
      
      matchesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      // Console log removed
    }
    
  } catch (error) {
    // Error handling removed
  }
}

export async function createTestFixtures(venueId: string) {
  try {
    // Get teams assigned to this venue
    const assignmentsSnapshot = await adminDb.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('assignedBy', '==', 'test_system')
      .get();
    
    if (assignmentsSnapshot.empty) {
      return {
        success: false,
        error: 'No test teams found for this venue. Create teams first.'
      };
    }
    
    const teams = assignmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        teamId: data.teamId,
        teamName: `Test Team ${data.teamId.slice(-2)}`
      };
    });
    
    const batch = adminDb.batch();
    
    // Create a volleyball tournament fixture
    const fixtureRef = adminDb.collection('fixtures').doc();
    const fixtureData = {
      name: 'Test Volleyball Tournament',
      eventId: 'isha_gramotsavam_2025',
      sportId: 'volleyball',
      sportName: 'Volleyball',
      genderCategory: 'men',
      venueId: venueId,
      level: 'cluster',
      status: 'in_progress',
      assignedTeams: teams,
      bracket: {
        matches: [],
        winners: []
      },
      maxTeams: teams.length,
      currentTeams: teams.length,
      createdBy: 'test_system',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    batch.set(fixtureRef, fixtureData);
    await batch.commit();
    
    return {
      success: true,
      message: 'Test fixture created successfully',
      fixtureId: fixtureRef.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createTestMatches(venueId: string) {
  try {
    // Get fixture for this venue
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .where('createdBy', '==', 'test_system')
      .get();
    
    if (fixturesSnapshot.empty) {
      return {
        success: false,
        error: 'No test fixtures found. Create fixtures first.'
      };
    }
    
    const fixture = fixturesSnapshot.docs[0];
    const fixtureData = fixture.data();
    const teams = fixtureData.assignedTeams || [];
    
    if (teams.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 teams to create matches'
      };
    }
    
    const batch = adminDb.batch();
    const matchesToCreate = Math.min(5, Math.floor(teams.length / 2)); // Create up to 5 test matches
    
    for (let i = 0; i < matchesToCreate; i++) {
      const team1 = teams[i * 2];
      const team2 = teams[i * 2 + 1];
      
      const matchRef = adminDb.collection('matches').doc();
      const matchData = {
        fixtureId: fixture.id,
        eventId: 'isha_gramotsavam_2025',
        sportId: 'volleyball',
        sportName: 'Volleyball',
        genderCategory: 'men',
        venueId: venueId,
        roundName: 'Round 1',
        matchNumber: i + 1,
        status: i < 2 ? 'completed' : i < 3 ? 'in_progress' : 'ready',
        team1: {
          teamId: team1.teamId,
          teamName: team1.teamName,
          tournamentNumber: (i * 2) + 1
        },
        team2: {
          teamId: team2.teamId,
          teamName: team2.teamName,
          tournamentNumber: (i * 2) + 2
        },
        result: i < 2 ? {
          winnerName: Math.random() > 0.5 ? team1.teamName : team2.teamName,
          winnerTeamId: Math.random() > 0.5 ? team1.teamId : team2.teamId,
          score: {
            team1Score: Math.floor(Math.random() * 3) + 1,
            team2Score: Math.floor(Math.random() * 3) + 1
          }
        } : null,
        scheduledTime: FieldValue.serverTimestamp(),
        createdBy: 'test_system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      batch.set(matchRef, matchData);
    }
    
    await batch.commit();
    
    return {
      success: true,
      message: `Created ${matchesToCreate} test matches`,
      matchCount: matchesToCreate
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getTestTeamsCount(venueId: string) {
  try {
    const assignmentsSnapshot = await adminDb.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('assignedBy', '==', 'test_system')
      .get();
    
    return {
      success: true,
      count: assignmentsSnapshot.docs.length
    };
    
  } catch (error) {
    // Error handling removed
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}