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

async function checkVenueData() {
  try {
    console.log('🔍 Checking actual venue data...\n');
    
    const venues = [
      { id: 'h52Fu10NKeL4IgfwjnZ2', expectedLevel: 'cluster' },
      { id: 'ju7ppexN4vFLSkoF11j3', expectedLevel: 'division' }
    ];
    
    for (const venue of venues) {
      console.log(`📍 VENUE: ${venue.id} (Expected: ${venue.expectedLevel})`);
      
      const venueDoc = await db.collection('venues').doc(venue.id).get();
      
      if (!venueDoc.exists) {
        console.log('   ❌ Venue document not found');
        continue;
      }
      
      const venueData = venueDoc.data();
      console.log('   Venue Data:');
      
      // Show all fields that might indicate level
      const levelFields = ['level', 'type', 'venueType', 'category', 'tournamentLevel'];
      levelFields.forEach(field => {
        if (venueData[field]) {
          console.log(`     ${field}: ${venueData[field]}`);
        }
      });
      
      // Show venue name for reference
      console.log(`     name: ${venueData.name}`);
      
      // Show all fields to see what's available
      console.log('   All fields:');
      Object.keys(venueData).sort().forEach(key => {
        if (!['createdAt', 'updatedAt', 'coordinates'].includes(key)) {
          console.log(`     ${key}: ${typeof venueData[key] === 'object' ? JSON.stringify(venueData[key]) : venueData[key]}`);
        }
      });
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking venue data:', error.message);
  }
}

checkVenueData();