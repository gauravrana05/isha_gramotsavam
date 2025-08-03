#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: './.env.local' });

// Setup Firebase Admin
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Use environment variables to create service account
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function cleanupTestFixtures(venueId) {
  try {
    console.log(`Cleaning up test fixtures for venue ${venueId}...`);
    
    // Get all fixtures for this venue
    const fixturesSnapshot = await db.collection('fixtures')
      .where('venueId', '==', venueId)
      .get();
    
    if (fixturesSnapshot.empty) {
      console.log('No fixtures found to delete');
      return { success: true, deletedCount: 0 };
    }
    
    const batch = db.batch();
    
    fixturesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Deleted ${fixturesSnapshot.docs.length} fixtures`);
    
    // Also clean up related matches
    const matchesSnapshot = await db.collection('matches')
      .where('venueId', '==', venueId)
      .get();
    
    if (!matchesSnapshot.empty) {
      const matchBatch = db.batch();
      
      matchesSnapshot.docs.forEach(doc => {
        matchBatch.delete(doc.ref);
      });
      
      await matchBatch.commit();
      console.log(`Deleted ${matchesSnapshot.docs.length} matches`);
    }
    
    return {
      success: true,
      deletedFixtures: fixturesSnapshot.docs.length,
      deletedMatches: matchesSnapshot.docs.length
    };
    
  } catch (error) {
    console.error('Error cleaning up fixtures:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

// Run the script
const venueId = process.argv[2] || 'AsyteU6KNh7b9YehSkYy';

cleanupTestFixtures(venueId)
  .then(result => {
    console.log('Cleanup result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  });