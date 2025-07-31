#!/usr/bin/env node

/**
 * Simple Node.js script to initialize Firebase database with Isha Gramotsavam data
 * Run with: node scripts/run-firebase-init.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp, Timestamp } = require('firebase/firestore');

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyD9-example-key-replace-with-yours",
  authDomain: "isha-gramotsavam.firebaseapp.com",
  projectId: "isha-gramotsavam",
  storageBucket: "isha-gramotsavam.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:example-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🚀 Starting Isha Gramotsavam Firebase Database Setup...\n');

async function setupDatabase() {
  try {
    console.log('📅 Setting up Main Event: Isha Gramotsavam 2025...');
    await setupMainEvent();
    
    console.log('🏐 Setting up Sports: Volleyball (Men & Women) and Throwball...');
    await setupSports();
    
    console.log('🏟️ Setting up Venues...');
    await setupVenues();
    
    console.log('⚙️ Setting up System Configuration...');
    await setupSystemConfig();
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n🎉 Isha Gramotsavam 2025 is ready to go!');
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error);
    process.exit(1);
  }
}

async function setupMainEvent() {
  const eventData = {
    id: 'isha_gramotsavam_2025',
    name: 'Isha Gramotsavam 2025',
    description: 'Annual rural sports festival celebrating traditional games and community spirit',
    type: 'tournament',
    status: 'ongoing',
    startDate: new Date('2025-03-01T06:00:00Z'),
    endDate: new Date('2025-03-07T20:00:00Z'),
    registrationStartDate: new Date('2025-01-01T00:00:00Z'),
    registrationEndDate: new Date('2025-02-15T23:59:59Z'),
    venue: 'Isha Yoga Center Sports Complex',
    maxParticipants: 1000,
    currentParticipants: 0,
    sports: ['volleyball_men', 'volleyball_women', 'throwball_women'],
    organizer: 'Isha Foundation',
    contact: {
      email: 'sports@isha.org',
      phone: '+91 422 2515345'
    },
    registrationFee: 500,
    totalPrizePool: 300000,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(doc(db, 'events', 'isha_gramotsavam_2025'), eventData);
  console.log('   ✅ Main event created');
}

async function setupSports() {
  const sports = [
    {
      sportId: 'volleyball_men',
      name: 'Volleyball (Men)',
      description: 'Traditional 6-a-side volleyball for men with professional rules',
      category: 'men',
      status: 'active',
      teamConfig: {
        minPlayers: 6,
        maxPlayers: 6,
        maxSubstitutes: 2,
        totalSquadSize: 8
      },
      eligibility: {
        ageRange: { min: 16, max: 35 },
        genderRestriction: 'men',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: new Date('2025-01-01T00:00:00Z'),
        registrationEnd: new Date('2025-02-15T23:59:59Z'),
        eventStart: new Date('2025-03-01T09:00:00Z'),
        eventEnd: new Date('2025-03-07T18:00:00Z'),
        registrationFee: 500,
        prizePool: { first: 50000, second: 30000, third: 20000 }
      },
      rules: {
        format: '6v6',
        matchDuration: 'Best of 5 sets',
        pointSystem: 'Rally point system (25 points per set)'
      },
      assets: {
        primaryImage: '/images/sports/volleyball-men.jpg',
        rulesDocument: '/documents/volleyball-rules.pdf'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sportId: 'volleyball_women',
      name: 'Volleyball (Women)', 
      description: 'Traditional 6-a-side volleyball for women with professional rules',
      category: 'women',
      status: 'active',
      teamConfig: {
        minPlayers: 6,
        maxPlayers: 6,
        maxSubstitutes: 2,
        totalSquadSize: 8
      },
      eligibility: {
        ageRange: { min: 16, max: 35 },
        genderRestriction: 'women',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: new Date('2025-01-01T00:00:00Z'),
        registrationEnd: new Date('2025-02-15T23:59:59Z'),
        eventStart: new Date('2025-03-02T09:00:00Z'),
        eventEnd: new Date('2025-03-06T18:00:00Z'),
        registrationFee: 500,
        prizePool: { first: 50000, second: 30000, third: 20000 }
      },
      rules: {
        format: '6v6',
        matchDuration: 'Best of 5 sets',
        pointSystem: 'Rally point system (25 points per set)'
      },
      assets: {
        primaryImage: '/images/sports/volleyball-women.jpg',
        rulesDocument: '/documents/volleyball-rules.pdf'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sportId: 'throwball_women',
      name: 'Throwball (Women)',
      description: 'Traditional throwball game for women - authentic rural sport',
      category: 'women',
      status: 'active',
      teamConfig: {
        minPlayers: 7,
        maxPlayers: 7,
        maxSubstitutes: 2,
        totalSquadSize: 9
      },
      eligibility: {
        ageRange: { min: 16, max: 35 },
        genderRestriction: 'women',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: new Date('2025-01-01T00:00:00Z'),
        registrationEnd: new Date('2025-02-15T23:59:59Z'),
        eventStart: new Date('2025-03-03T09:00:00Z'),
        eventEnd: new Date('2025-03-07T17:00:00Z'),
        registrationFee: 500,
        prizePool: { first: 50000, second: 30000, third: 20000 }
      },
      rules: {
        format: '7v7',
        matchDuration: 'Best of 3 sets (15 points each)',
        pointSystem: 'Traditional scoring'
      },
      assets: {
        primaryImage: '/images/sports/throwball.jpg',
        rulesDocument: '/documents/throwball-rules.pdf'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const sport of sports) {
    await setDoc(doc(db, 'sports', sport.sportId), sport);
    console.log(`   ✅ ${sport.name} created`);
  }
}

async function setupVenues() {
  const venues = [
    {
      id: 'isha_main_ground',
      name: 'Isha Sports Complex - Main Ground',
      description: 'Primary outdoor sports complex with professional facilities',
      type: 'outdoor',
      location: {
        address: 'Isha Yoga Center, Velliangiri Foothills',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641114'
      },
      capacity: 500,
      facilities: ['Changing Rooms', 'Parking', 'Cafeteria', 'First Aid', 'WiFi'],
      sports: ['volleyball_men', 'volleyball_women', 'throwball_women'],
      status: 'active',
      availability: {
        startTime: '06:00',
        endTime: '20:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      contact: {
        manager: 'Rajesh Kumar',
        phone: '+91 9876543210',
        email: 'rajesh@isha.org'
      },
      pricing: {
        hourlyRate: 1500,
        fullDayRate: 12000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'community_center',
      name: 'Community Center Indoor Courts',
      description: 'Indoor facility with air conditioning and modern amenities',
      type: 'indoor',
      location: {
        address: '123 Community Street, RS Puram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641002'
      },
      capacity: 200,
      facilities: ['Air Conditioning', 'Sound System', 'Changing Rooms', 'Parking'],
      sports: ['volleyball_women'],
      status: 'active',
      availability: {
        startTime: '08:00',
        endTime: '22:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      },
      contact: {
        manager: 'Priya Sharma',
        phone: '+91 9876543211',
        email: 'priya@community.org'
      },
      pricing: {
        hourlyRate: 2000,
        fullDayRate: 15000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const venue of venues) {
    await setDoc(doc(db, 'venues', venue.id), venue);
    console.log(`   ✅ ${venue.name} created`);
  }
}

async function setupSystemConfig() {
  const systemConfig = {
    id: 'main_config',
    eventSettings: {
      currentEvent: 'isha_gramotsavam_2025',
      registrationOpen: true,
      maxTeamsPerSport: 64,
      registrationFee: 500
    },
    paymentSettings: {
      enabled: true,
      methods: ['razorpay', 'upi', 'netbanking'],
      currency: 'INR'
    },
    verificationSettings: {
      autoVerification: false,
      requiredDocuments: ['teamPhoto', 'captainId', 'playerIds'],
      verificationTimeoutDays: 7
    },
    systemLimits: {
      maxFileSize: 5242880, // 5MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      maxPlayersPerTeam: 12,
      minPlayersPerTeam: 6
    },
    maintenanceMode: false,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(doc(db, 'system', 'config'), systemConfig);
  console.log('   ✅ System configuration created');
}

// Run the setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🏆 Ready to host Isha Gramotsavam 2025!');
      console.log('📱 Users can now register teams and participate in:');
      console.log('   • Volleyball (Men)');
      console.log('   • Volleyball (Women)');
      console.log('   • Throwball (Women)');
      console.log('\n🎯 Total Prize Pool: ₹3,00,000');
      console.log('📅 Event Dates: March 1-7, 2025');
      console.log('📍 Venue: Isha Yoga Center, Coimbatore');
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };