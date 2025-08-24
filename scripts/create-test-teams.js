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

async function createTestTeams(venueId, count = 25) {
  try {
    // Creating test teams for venue
    
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
    
    // Successfully created test teams
    return {
      success: true,
      message: `Created ${count} test teams`,
      teamIds
    };
    
  } catch (error) {
    // Error creating test teams
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

// Run the script
const venueId = process.argv[2] || 'AsyteU6KNh7b9YehSkYy';
const count = parseInt(process.argv[3]) || 25;

createTestTeams(venueId, count)
  .then(result => {
    process.exit(0);
  })
  .catch(error => {
    process.exit(1);
  });