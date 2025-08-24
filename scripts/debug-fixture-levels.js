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

async function debugFixtureLevels() {
  try {
    console.log('🔍 Debugging fixture levels and venue assignments...\n');
    
    // 1. Check Team Bela's venue assignments
    const teamId = 'uPlbzxI0f6jYCMEHeFp4';
    const teamDoc = await db.collection('teams').doc(teamId).get();
    const teamData = teamDoc.data();
    
    console.log('📊 TEAM BELA STATUS:');
    console.log(`   Current Level: ${teamData.currentLevel}`);
    console.log(`   Cluster Venue: ${teamData.clusterVenueId} (${teamData.clusterVenue})`);
    console.log(`   Division Venue: ${teamData.divisionVenueId} (${teamData.divisionVenueName})`);
    
    // 2. Check venue assignments collection
    console.log('\n📍 VENUE ASSIGNMENTS:');
    const assignmentsSnapshot = await db.collection('teamVenueAssignment')
      .where('teamId', '==', teamId)
      .get();
    
    assignmentsSnapshot.docs.forEach((doc, index) => {
      const assignment = doc.data();
      console.log(`   Assignment ${index + 1}:`);
      console.log(`     Venue ID: ${assignment.venueId || assignment.clusterVenueId || assignment.divisionVenueId}`);
      console.log(`     Venue Name: ${assignment.venueName || assignment.clusterVenueName || assignment.divisionVenueName}`);
      console.log(`     Current Level: ${assignment.currentLevel}`);
      console.log(`     Assignment Level: ${assignment.assignmentLevel}`);
    });
    
    // 3. Check all fixtures for both venues
    const venues = [teamData.clusterVenueId, teamData.divisionVenueId].filter(Boolean);
    
    for (const venueId of venues) {
      console.log(`\n🏟️ FIXTURES FOR VENUE: ${venueId}`);
      const fixturesSnapshot = await db.collection('fixtures')
        .where('venueId', '==', venueId)
        .get();
      
      if (fixturesSnapshot.empty) {
        console.log('   No fixtures found');
      } else {
        fixturesSnapshot.docs.forEach(doc => {
          const fixture = doc.data();
          console.log(`   Fixture: ${fixture.name}`);
          console.log(`     Level: ${fixture.level}`);
          console.log(`     Status: ${fixture.status}`);
          console.log(`     Sport: ${fixture.sportName} ${fixture.genderCategory}`);
          console.log(`     Teams: ${fixture.assignedTeams?.length || 0}`);
        });
      }
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log(`   Team's current level: ${teamData.currentLevel}`);
    console.log('   Expected behavior:');
    console.log('   - Cluster fixtures should show level="cluster"');
    console.log('   - Division fixtures should show level="division"');
    console.log('   - Display should match the actual fixture level, not venue assignment level');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFixtureLevels();