const { createFixturesForRealTeam } = require('./testDataJS.js');
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  let credential;
  
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
  }
  
  admin.initializeApp({
    credential: credential,
  });
}

const db = admin.firestore();

async function createDivisionTournament(teamId) {
  try {
    console.log(`🏆 Creating DIVISION tournament for team: ${teamId}`);
    
    // 1. Get team data
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      console.error('❌ Team not found');
      return;
    }
    
    const teamData = teamDoc.data();
    console.log(`   Team: ${teamData.name || teamData.teamName}`);
    console.log(`   Current Level: ${teamData.currentLevel}`);
    console.log(`   Division Venue: ${teamData.divisionVenueId} (${teamData.divisionVenueName})`);
    
    // 2. Get division venue ID
    const divisionVenueId = teamData.divisionVenueId;
    if (!divisionVenueId) {
      console.error('❌ No division venue found for this team');
      return;
    }
    
    // 3. Create some opponent teams for division level (simulated)
    const divisionTeams = [
      {
        teamId: teamId,
        teamName: teamData.name || teamData.teamName
      },
      {
        teamId: 'div_team_2',
        teamName: 'Champion Team A'
      },
      {
        teamId: 'div_team_3', 
        teamName: 'Champion Team B'
      },
      {
        teamId: 'div_team_4',
        teamName: 'Champion Team C'
      }
    ];
    
    // 4. Create division fixture
    const fixtureRef = db.collection('fixtures').doc();
    const fixtureData = {
      name: `${teamData.sportName || 'Volleyball'} Division Championship`,
      eventId: 'isha_gramotsavam_2025',
      sportId: teamData.sportId || 'volleyball',
      sportName: teamData.sportName || 'Volleyball', 
      genderCategory: teamData.genderCategory || 'M',
      venueId: divisionVenueId,
      level: 'division',
      status: 'in_progress',
      assignedTeams: divisionTeams,
      bracket: {
        matches: [],
        winners: []
      },
      maxTeams: divisionTeams.length,
      currentTeams: divisionTeams.length,
      createdBy: 'test_system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await fixtureRef.set(fixtureData);
    console.log(`   ✅ Created division fixture: ${fixtureData.name}`);
    
    // 5. Create division matches
    const batch = db.batch();
    const matches = [
      {
        team1: divisionTeams[0], // Your team
        team2: divisionTeams[1],
        status: 'ready',
        result: null
      },
      {
        team1: divisionTeams[2],
        team2: divisionTeams[3], 
        status: 'completed',
        result: {
          winnerName: divisionTeams[2].teamName,
          winnerTeamId: divisionTeams[2].teamId,
          score: { team1Score: 2, team2Score: 1 }
        }
      }
    ];
    
    matches.forEach((match, i) => {
      const matchRef = db.collection('matches').doc();
      const matchData = {
        fixtureId: fixtureRef.id,
        eventId: 'isha_gramotsavam_2025',
        sportId: teamData.sportId || 'volleyball',
        sportName: teamData.sportName || 'Volleyball',
        genderCategory: teamData.genderCategory || 'M',
        venueId: divisionVenueId,
        roundName: 'Semi Finals',
        matchNumber: i + 1,
        status: match.status,
        team1: {
          teamId: match.team1.teamId,
          teamName: match.team1.teamName,
          tournamentNumber: (i * 2) + 1
        },
        team2: {
          teamId: match.team2.teamId,
          teamName: match.team2.teamName, 
          tournamentNumber: (i * 2) + 2
        },
        result: match.result,
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'test_system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(matchRef, matchData);
    });
    
    await batch.commit();
    
    console.log(`   ✅ Created ${matches.length} division matches`);
    console.log(`\n🎯 Division tournament ready!`);
    console.log(`   - Level: DIVISION`);
    console.log(`   - Venue: ${teamData.divisionVenueName}`);
    console.log(`   - Your team's next match: vs ${divisionTeams[1].teamName}`);
    
  } catch (error) {
    console.error('❌ Error creating division tournament:', error.message);
  }
}

// Get team ID from command line or use default
const teamId = process.argv[2] || 'uPlbzxI0f6jYCMEHeFp4';
createDivisionTournament(teamId);