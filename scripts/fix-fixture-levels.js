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

async function fixFixtureLevels() {
  try {
    console.log('🔧 Fixing fixture levels to match venue types...\n');
    
    // Division venue ID from Team Bela
    const divisionVenueId = 'ju7ppexN4vFLSkoF11j3';
    
    // 1. Find fixtures at division venue that have wrong level
    console.log(`Looking for fixtures at division venue: ${divisionVenueId}`);
    const fixturesSnapshot = await db.collection('fixtures')
      .where('venueId', '==', divisionVenueId)
      .get();
    
    if (fixturesSnapshot.empty) {
      console.log('❌ No fixtures found at division venue');
      return;
    }
    
    const batch = db.batch();
    let fixedCount = 0;
    
    fixturesSnapshot.docs.forEach(doc => {
      const fixture = doc.data();
      console.log(`\nFixture: ${fixture.name}`);
      console.log(`  Current level: ${fixture.level}`);
      
      if (fixture.level !== 'division') {
        console.log(`  ✅ Fixing level from "${fixture.level}" to "division"`);
        
        // Update fixture level and name to reflect division level
        batch.update(doc.ref, {
          level: 'division',
          name: fixture.name.replace('cluster', 'division'),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        fixedCount++;
      } else {
        console.log(`  ✅ Already correct level: ${fixture.level}`);
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Fixed ${fixedCount} fixtures to have correct division level`);
      
      // Also fix any matches at division venue
      console.log('\n🔧 Fixing match levels...');
      const matchesSnapshot = await db.collection('matches')
        .where('venueId', '==', divisionVenueId)
        .get();
      
      if (!matchesSnapshot.empty) {
        const matchBatch = db.batch();
        matchesSnapshot.docs.forEach(doc => {
          matchBatch.update(doc.ref, {
            roundName: 'Division Round',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        await matchBatch.commit();
        console.log(`✅ Fixed ${matchesSnapshot.docs.length} matches to have division round name`);
      }
      
    } else {
      console.log('\n✅ No fixtures needed fixing - all levels are correct');
    }
    
    console.log('\n🎉 Fixture level fix complete!');
    console.log('   Division venue fixtures now show level: "division"');
    console.log('   Cluster venue fixtures show level: "cluster"');
    
  } catch (error) {
    console.error('❌ Error fixing fixture levels:', error.message);
  }
}

fixFixtureLevels();