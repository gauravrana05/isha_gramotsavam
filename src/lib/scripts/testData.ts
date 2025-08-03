'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function createTestTeams(venueId: string, count: number = 25) {
  try {
    console.log(`Creating ${count} test teams for venue ${venueId}...`);
    
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
      
      // Create team venue assignment
      const assignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
      const assignmentData = {
        teamId,
        eventId: 'isha_gramotsavam_2025',
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
    
    console.log(`Successfully created ${count} test teams`);
    return {
      success: true,
      message: `Created ${count} test teams`,
      teamIds
    };
    
  } catch (error) {
    console.error('Error creating test teams:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteTestTeams(venueId: string) {
  try {
    console.log(`Deleting test teams for venue ${venueId}...`);
    
    // Get all teams assigned to this venue that were created by test system
    const assignmentsSnapshot = await adminDb.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('assignedBy', '==', 'test_system')
      .get();
    
    if (assignmentsSnapshot.empty) {
      console.log('No test teams found to delete');
      return {
        success: true,
        message: 'No test teams found to delete',
        deletedCount: 0
      };
    }
    
    const teamIds = assignmentsSnapshot.docs.map(doc => doc.data().teamId);
    console.log(`Found ${teamIds.length} test teams to delete`);
    
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
      console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} (${batchTeamIds.length} teams)`);
    }
    
    // Also clean up any fixtures created with test teams
    await deleteTestFixtures(venueId);
    
    // Clean up any test matches
    await deleteTestMatches(venueId);
    
    console.log(`Successfully deleted ${deletedCount} test teams`);
    return {
      success: true,
      message: `Deleted ${deletedCount} test teams and related data`,
      deletedCount
    };
    
  } catch (error) {
    console.error('Error deleting test teams:', error);
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
      console.log(`Deleted ${fixturesSnapshot.docs.length} test fixtures`);
    }
    
  } catch (error) {
    console.error('Error deleting test fixtures:', error);
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
      console.log(`Deleted ${matchesSnapshot.docs.length} test matches`);
    }
    
  } catch (error) {
    console.error('Error deleting test matches:', error);
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
    console.error('Error getting test teams count:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}