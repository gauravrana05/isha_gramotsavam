const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
  console.log('✅ Loaded environment variables from .env.local');
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Try to use environment variables first, then fall back to service account file
  let credential;
  
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // Use environment variables
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
  } else {
    // Fall back to service account file
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      credential = admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error('❌ Firebase credentials not found. Please either:');
      console.error('1. Add serviceAccountKey.json to the project root, or');
      console.error('2. Set environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
      process.exit(1);
    }
  }
  
  admin.initializeApp({
    credential: credential,
  });
}

const db = admin.firestore();

async function createTestTeams(venueId, count = 25) {
  try {
    console.log(`Creating ${count} test teams for venue ${venueId}...`);
    
    const batch = db.batch();
    const teamIds = [];
    
    const sports = ['volleyball'];
    const genders = ['men'];
    const districts = ['Coimbatore'];
    const taluks = ['North', 'South', 'East', 'West', 'Central'];
    
    for (let i = 1; i <= count; i++) {
      const sport = sports[0];
      const gender = genders[0];
      const district = districts[0];
      const taluk = taluks[1];
      
      // Create team document
      const teamRef = db.collection('teams').doc();
      const teamId = teamRef.id;
      teamIds.push(teamId);
      
      const teamData = {
        name: `Test Team ${i.toString().padStart(2, '0')}`,
        teamName: `Test Team ${i.toString().padStart(2, '0')}`,
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
        checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
        checkedInBy: 'test_system',
        autoCheckedIn: true,
        tournamentNumber: i,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBy: 'test_admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(teamRef, teamData);
      
      // Create test players for this team
      for (let j = 1; j <= 11; j++) {
        const playerRef = db.collection('teams').doc(teamId).collection('players').doc();
        const playerData = {
          userId: `test_user_${i}_${j}`,
          firstName: `Player${j}`,
          lastName: `Team${i}`,
          email: `player${j}.team${i}@test.com`,
          phone: `+919000${i.toString().padStart(2, '0')}${j.toString().padStart(2, '0')}`,
          position: j <= 11 ? 'main' : 'substitute',
          jerseyNumber: j,
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
          addedBy: `test_captain_${i}`,
          verificationStatus: 'verified',
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          verifiedBy: 'test_admin',
          isDeleted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(playerRef, playerData);
      }
      
      // Create team venue assignment
      const assignmentRef = db.collection('teamVenueAssignment').doc(teamId);
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
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        clusterQualified: false,
        divisionQualified: false,
        finalQualified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(assignmentRef, assignmentData);
    }
    
    await batch.commit();
    
    return {
      success: true,
      message: `Created ${count} test teams`,
      teamIds
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function createTestFixtures(venueId) {
  try {
    // Get teams assigned to this venue
    const assignmentsSnapshot = await db.collection('teamVenueAssignment')
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
    
    const batch = db.batch();
    
    // Create a volleyball tournament fixture
    const fixtureRef = db.collection('fixtures').doc();
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
      error: error.message
    };
  }
}

async function createTestMatches(venueId) {
  try {
    // Get fixture for this venue
    const fixturesSnapshot = await db.collection('fixtures')
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
    
    const batch = db.batch();
    const matchesToCreate = Math.min(8, Math.floor(teams.length / 2)); // Create up to 8 test matches
    
    for (let i = 0; i < matchesToCreate; i++) {
      const team1 = teams[i * 2];
      const team2 = teams[i * 2 + 1];
      
      const matchRef = db.collection('matches').doc();
      const matchData = {
        fixtureId: fixture.id,
        eventId: 'isha_gramotsavam_2025',
        sportId: 'volleyball',
        sportName: 'Volleyball',
        genderCategory: 'men',
        venueId: venueId,
        roundName: 'Round 1',
        matchNumber: i + 1,
        status: i < 3 ? 'completed' : i < 5 ? 'in_progress' : 'ready',
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
        result: i < 3 ? {
          winnerName: Math.random() > 0.5 ? team1.teamName : team2.teamName,
          winnerTeamId: Math.random() > 0.5 ? team1.teamId : team2.teamId,
          score: {
            team1Score: Math.floor(Math.random() * 3) + 1,
            team2Score: Math.floor(Math.random() * 3) + 1
          }
        } : null,
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'test_system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
      error: error.message
    };
  }
}

async function getTestTeamsCount(venueId) {
  try {
    const assignmentsSnapshot = await db.collection('teamVenueAssignment')
      .where('clusterVenueId', '==', venueId)
      .where('assignedBy', '==', 'test_system')
      .get();
    
    return {
      success: true,
      count: assignmentsSnapshot.docs.length
    };
    
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

async function cleanupAllTestData() {
  try {
    console.log('🧹 Cleaning up all test data...');
    let deletedCount = 0;

    // 1. Delete test teams and their players
    console.log('1. Deleting test teams and players...');
    const teamsQuery = db.collection('teams').where('captainId', '>=', 'test_captain_1').where('captainId', '<=', 'test_captain_999');
    const teamsSnapshot = await teamsQuery.get();
    
    for (const teamDoc of teamsSnapshot.docs) {
      const batch = db.batch();
      
      // Delete all players in this team
      const playersSnapshot = await db.collection('teams').doc(teamDoc.id).collection('players').get();
      playersSnapshot.docs.forEach(playerDoc => {
        batch.delete(playerDoc.ref);
        deletedCount++;
      });
      
      // Delete the team
      batch.delete(teamDoc.ref);
      deletedCount++;
      
      await batch.commit();
    }
    console.log(`   Deleted ${teamsSnapshot.docs.length} teams and their players`);

    // 2. Delete test venue assignments
    console.log('2. Deleting test venue assignments...');
    const assignmentsSnapshot = await db.collection('teamVenueAssignment')
      .where('assignedBy', '==', 'test_system')
      .get();
    
    if (!assignmentsSnapshot.empty) {
      const batch = db.batch();
      assignmentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();
      console.log(`   Deleted ${assignmentsSnapshot.docs.length} venue assignments`);
    }

    // 3. Delete test fixtures
    console.log('3. Deleting test fixtures...');
    const fixturesSnapshot = await db.collection('fixtures')
      .where('createdBy', '==', 'test_system')
      .get();
    
    if (!fixturesSnapshot.empty) {
      const batch = db.batch();
      fixturesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();
      console.log(`   Deleted ${fixturesSnapshot.docs.length} fixtures`);
    }

    // 4. Delete test matches
    console.log('4. Deleting test matches...');
    const matchesSnapshot = await db.collection('matches')
      .where('createdBy', '==', 'test_system')
      .get();
    
    if (!matchesSnapshot.empty) {
      const batch = db.batch();
      matchesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();
      console.log(`   Deleted ${matchesSnapshot.docs.length} matches`);
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} total documents.`);
    
    return {
      success: true,
      message: `Successfully cleaned up all test data`,
      deletedCount
    };

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createFixturesForRealTeam(teamId) {
  try {
    console.log(`🏆 Creating fixtures for team: ${teamId}`);
    
    // 1. Get the real team data
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        success: false,
        error: `Team ${teamId} not found`
      };
    }
    
    const teamData = teamDoc.data();
    console.log(`   Found team: ${teamData.teamName || teamData.name}`);
    
    // 2. Get the team's venue assignment
    const assignmentSnapshot = await db.collection('teamVenueAssignment')
      .where('teamId', '==', teamId)
      .limit(1)
      .get();
    
    if (assignmentSnapshot.empty) {
      return {
        success: false,
        error: `No venue assignment found for team ${teamId}`
      };
    }
    
    const assignment = assignmentSnapshot.docs[0].data();
    const venueId = assignment.venueId || assignment.clusterVenueId || assignment.divisionVenueId;
    console.log(`   Team assigned to venue: ${venueId}`);
    
    // 3. Get other teams at the same venue (try different venue field names)
    let otherTeamsSnapshot = await db.collection('teamVenueAssignment')
      .where('venueId', '==', venueId)
      .get();
    
    // If no teams found with venueId, try clusterVenueId
    if (otherTeamsSnapshot.empty) {
      otherTeamsSnapshot = await db.collection('teamVenueAssignment')
        .where('clusterVenueId', '==', venueId)
        .get();
    }
    
    // If still no teams found, try divisionVenueId
    if (otherTeamsSnapshot.empty) {
      otherTeamsSnapshot = await db.collection('teamVenueAssignment')
        .where('divisionVenueId', '==', venueId)
        .get();
    }
    
    const allTeams = [];
    for (const doc of otherTeamsSnapshot.docs) {
      const assignmentData = doc.data();
      const otherTeamDoc = await db.collection('teams').doc(assignmentData.teamId).get();
      if (otherTeamDoc.exists) {
        const otherTeamData = otherTeamDoc.data();
        allTeams.push({
          teamId: assignmentData.teamId,
          teamName: otherTeamData.teamName || otherTeamData.name || `Team ${assignmentData.teamId.slice(-4)}`
        });
      }
    }
    
    console.log(`   Found ${allTeams.length} teams at this venue`);
    
    // 4. Create a tournament fixture
    const fixtureRef = db.collection('fixtures').doc();
    const fixtureData = {
      name: `${teamData.sportName || 'Tournament'} Championship`,
      eventId: 'isha_gramotsavam_2025',
      sportId: teamData.sportId || 'volleyball',
      sportName: teamData.sportName || 'Volleyball',
      genderCategory: teamData.genderCategory || 'men',
      venueId: venueId,
      level: 'cluster',
      status: 'in_progress',
      assignedTeams: allTeams,
      bracket: {
        matches: [],
        winners: []
      },
      maxTeams: allTeams.length,
      currentTeams: allTeams.length,
      createdBy: 'test_system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await fixtureRef.set(fixtureData);
    console.log(`   Created fixture: ${fixtureData.name}`);
    
    // 5. Create sample matches
    const matchesToCreate = Math.min(6, Math.floor(allTeams.length / 2));
    console.log(`   Creating ${matchesToCreate} sample matches...`);
    
    const batch = db.batch();
    for (let i = 0; i < matchesToCreate; i++) {
      const team1 = allTeams[i * 2 % allTeams.length];
      const team2 = allTeams[(i * 2 + 1) % allTeams.length];
      
      const matchRef = db.collection('matches').doc();
      const matchData = {
        fixtureId: fixtureRef.id,
        eventId: 'isha_gramotsavam_2025',
        sportId: teamData.sportId || 'volleyball',
        sportName: teamData.sportName || 'Volleyball',
        genderCategory: teamData.genderCategory || 'men',
        venueId: venueId,
        roundName: 'Round 1',
        matchNumber: i + 1,
        status: i < 2 ? 'completed' : i < 4 ? 'in_progress' : 'ready',
        team1: {
          teamId: team1.teamId,
          teamName: team1.teamName,
          tournamentNumber: i * 2 + 1
        },
        team2: {
          teamId: team2.teamId,
          teamName: team2.teamName,
          tournamentNumber: i * 2 + 2
        },
        result: i < 2 ? {
          winnerName: Math.random() > 0.5 ? team1.teamName : team2.teamName,
          winnerTeamId: Math.random() > 0.5 ? team1.teamId : team2.teamId,
          score: {
            team1Score: Math.floor(Math.random() * 3) + 1,
            team2Score: Math.floor(Math.random() * 3) + 1
          }
        } : null,
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'test_system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(matchRef, matchData);
    }
    
    await batch.commit();
    
    return {
      success: true,
      message: `Created tournament fixtures and ${matchesToCreate} matches for team ${teamData.teamName || teamData.name}`,
      fixtureId: fixtureRef.id,
      matchCount: matchesToCreate,
      teamsInTournament: allTeams.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createTestTeams,
  createTestFixtures,
  createTestMatches,
  getTestTeamsCount,
  cleanupAllTestData,
  createFixturesForRealTeam
};