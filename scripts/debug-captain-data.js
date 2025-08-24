const { cleanupAllTestData } = require('./testDataJS.js');
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
  console.log('✅ Loaded environment variables from .env.local');
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

async function debugCaptainData(captainId) {
  try {
    console.log(`🔍 Debugging captain data for: ${captainId}\n`);
    
    // 1. Find captain's teams
    console.log('1. Finding captain\'s teams...');
    const teamsSnapshot = await db.collection('teams')
      .where('captainId', '==', captainId)
      .get();
    
    console.log(`   Found ${teamsSnapshot.docs.length} teams`);
    
    if (teamsSnapshot.empty) {
      console.log('❌ No teams found for this captain!');
      return;
    }
    
    const venueIds = new Set();
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      console.log(`\n   Team: ${teamData.name || teamData.teamName} (ID: ${teamDoc.id})`);
      console.log(`   Sport: ${teamData.sportName || teamData.sportId}`);
      console.log(`   Status: ${teamData.status}`);
      
      // 2. Check venue assignment for each team
      console.log(`   Checking venue assignment...`);
      const assignmentSnapshot = await db.collection('teamVenueAssignment')
        .where('teamId', '==', teamDoc.id)
        .get();
      
      if (assignmentSnapshot.empty) {
        console.log(`   ❌ No venue assignment found for team ${teamDoc.id}`);
      } else {
        assignmentSnapshot.docs.forEach(assignDoc => {
          const assignData = assignDoc.data();
          const venueId = assignData.venueId || assignData.clusterVenueId || assignData.divisionVenueId;
          console.log(`   ✅ Assigned to venue: ${venueId} (${assignData.venueName || assignData.clusterVenueName || assignData.divisionVenueName})`);
          if (venueId) venueIds.add(venueId);
        });
      }
    }
    
    console.log(`\n3. Checking fixtures for venues: [${Array.from(venueIds).join(', ')}]`);
    
    // 3. Check fixtures for these venues
    if (venueIds.size > 0) {
      for (const venueId of venueIds) {
        console.log(`\n   Checking fixtures for venue: ${venueId}`);
        const fixturesSnapshot = await db.collection('fixtures')
          .where('venueId', '==', venueId)
          .get();
        
        console.log(`   Found ${fixturesSnapshot.docs.length} fixtures`);
        
        fixturesSnapshot.docs.forEach(fixtureDoc => {
          const fixtureData = fixtureDoc.data();
          console.log(`     Fixture: ${fixtureData.name} (ID: ${fixtureDoc.id})`);
          console.log(`     Status: ${fixtureData.status}`);
          console.log(`     Teams: ${fixtureData.assignedTeams?.length || 0}`);
          console.log(`     Created by: ${fixtureData.createdBy}`);
        });
      }
      
      // 4. Check matches for these venues
      console.log(`\n4. Checking matches for venues...`);
      for (const venueId of venueIds) {
        console.log(`\n   Checking matches for venue: ${venueId}`);
        const matchesSnapshot = await db.collection('matches')
          .where('venueId', '==', venueId)
          .get();
        
        console.log(`   Found ${matchesSnapshot.docs.length} matches`);
        
        matchesSnapshot.docs.forEach(matchDoc => {
          const matchData = matchDoc.data();
          console.log(`     Match: ${matchData.team1?.teamName} vs ${matchData.team2?.teamName}`);
          console.log(`     Status: ${matchData.status}`);
          console.log(`     Created by: ${matchData.createdBy}`);
        });
      }
    } else {
      console.log('❌ No venue IDs found - teams not assigned to venues!');
    }
    
    console.log('\n📋 Summary:');
    console.log(`   - Teams found: ${teamsSnapshot.docs.length}`);
    console.log(`   - Venues: ${venueIds.size}`);
    console.log(`   - Captain should see fixtures if venues have fixtures`);
    
  } catch (error) {
    console.error('❌ Error debugging captain data:', error.message);
  }
}

// Get captain ID from command line or use default
const captainId = process.argv[2] || 'JyCzAIBkpeSE7HQblMG3sk1ofkB2';
debugCaptainData(captainId);