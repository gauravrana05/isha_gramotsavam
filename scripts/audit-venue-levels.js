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

// Initialize Firebase Admin
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

async function auditVenueLevels() {
  try {
    console.log('🔍 Auditing Venue Level Mappings...\n');
    
    // 1. Check Team Bela's venues
    const teamBela = {
      clusterVenueId: 'h52Fu10NKeL4IgfwjnZ2',
      divisionVenueId: 'ju7ppexN4vFLSkoF11j3'
    };
    
    console.log('📊 TEAM BELA VENUES:');
    console.log(`   Cluster: ${teamBela.clusterVenueId}`);
    console.log(`   Division: ${teamBela.divisionVenueId}`);
    
    // 2. Check venue location mappings
    console.log('\n🗺️ VENUE LOCATION MAPPINGS:');
    
    for (const [level, venueId] of [
      ['cluster', teamBela.clusterVenueId],
      ['division', teamBela.divisionVenueId]
    ]) {
      console.log(`\n   Checking ${level} venue: ${venueId}`);
      
      const mappingSnapshot = await db.collection('venueLocationMapping')
        .where('venueId', '==', venueId)
        .where('isActive', '==', true)
        .get();
      
      if (mappingSnapshot.empty) {
        console.log(`   ❌ NO MAPPING FOUND for ${level} venue`);
      } else {
        mappingSnapshot.docs.forEach((doc, index) => {
          const mapping = doc.data();
          console.log(`   ✅ Mapping ${index + 1}:`);
          console.log(`      Venue Type: ${mapping.venueType || 'UNDEFINED'}`);
          console.log(`      Expected: ${level}`);
          console.log(`      Match: ${mapping.venueType === level ? '✅' : '❌'}`);
        });
      }
    }
    
    // 3. Check existing fixtures and their levels
    console.log('\n🏟️ EXISTING FIXTURES ANALYSIS:');
    
    for (const [expectedLevel, venueId] of [
      ['cluster', teamBela.clusterVenueId],
      ['division', teamBela.divisionVenueId]
    ]) {
      console.log(`\n   Fixtures at ${expectedLevel} venue (${venueId}):`);
      
      const fixturesSnapshot = await db.collection('fixtures')
        .where('venueId', '==', venueId)
        .get();
      
      if (fixturesSnapshot.empty) {
        console.log(`   No fixtures found`);
      } else {
        fixturesSnapshot.docs.forEach(doc => {
          const fixture = doc.data();
          console.log(`   Fixture: ${fixture.name}`);
          console.log(`     Current Level: ${fixture.level}`);
          console.log(`     Expected: ${expectedLevel}`);
          console.log(`     Correct: ${fixture.level === expectedLevel ? '✅' : '❌'}`);
          if (fixture.level !== expectedLevel) {
            console.log(`     👉 NEEDS FIXING: ${fixture.level} → ${expectedLevel}`);
          }
        });
      }
    }
    
    // 4. Recommend fixes
    console.log('\n💡 RECOMMENDATIONS:');
    
    // Check if venue mappings exist
    const clusterMappingSnapshot = await db.collection('venueLocationMapping')
      .where('venueId', '==', teamBela.clusterVenueId)
      .where('isActive', '==', true)
      .get();
    
    const divisionMappingSnapshot = await db.collection('venueLocationMapping')
      .where('venueId', '==', teamBela.divisionVenueId)
      .where('isActive', '==', true)
      .get();
    
    if (clusterMappingSnapshot.empty) {
      console.log(`   1. Create venueLocationMapping for cluster venue ${teamBela.clusterVenueId}`);
    }
    
    if (divisionMappingSnapshot.empty) {
      console.log(`   2. Create venueLocationMapping for division venue ${teamBela.divisionVenueId}`);
    }
    
    if (!clusterMappingSnapshot.empty) {
      const clusterMapping = clusterMappingSnapshot.docs[0].data();
      if (clusterMapping.venueType !== 'cluster') {
        console.log(`   3. Fix cluster venue mapping: ${clusterMapping.venueType} → cluster`);
      }
    }
    
    if (!divisionMappingSnapshot.empty) {
      const divisionMapping = divisionMappingSnapshot.docs[0].data();
      if (divisionMapping.venueType !== 'division') {
        console.log(`   4. Fix division venue mapping: ${divisionMapping.venueType} → division`);
      }
    }
    
    // Check fixtures that need level fixing
    const allFixturesSnapshot = await db.collection('fixtures')
      .where('venueId', 'in', [teamBela.clusterVenueId, teamBela.divisionVenueId])
      .get();
    
    const fixturesNeedingFix = [];
    allFixturesSnapshot.docs.forEach(doc => {
      const fixture = doc.data();
      const expectedLevel = fixture.venueId === teamBela.clusterVenueId ? 'cluster' : 'division';
      if (fixture.level !== expectedLevel) {
        fixturesNeedingFix.push({
          id: doc.id,
          name: fixture.name,
          currentLevel: fixture.level,
          expectedLevel: expectedLevel,
          venueId: fixture.venueId
        });
      }
    });
    
    if (fixturesNeedingFix.length > 0) {
      console.log(`   5. Fix ${fixturesNeedingFix.length} fixtures with wrong levels`);
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('   Run fix-venue-levels.js to automatically fix these issues');
    
  } catch (error) {
    console.error('❌ Error during audit:', error.message);
  }
}

auditVenueLevels();