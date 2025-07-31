/**
 * Firebase Database Initialization Script
 * Run this script to populate the Firebase database with initial data for Isha Gramotsavam
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Utility function to create safe date
const safeDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
};

async function initializeDatabase() {
  console.log('🚀 Starting Firebase database initialization...');

  try {
    // 1. Initialize Events
    await initializeEvents();
    
    // 2. Initialize Sports
    await initializeSports();
    
    // 3. Initialize Venues
    await initializeVenues();
    
    // 4. Initialize Users (Sample)
    await initializeUsers();
    
    // 5. Initialize Teams (Sample)
    await initializeTeams();
    
    // 6. Initialize System Configuration
    await initializeSystemConfig();
    
    console.log('✅ Firebase database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

async function initializeEvents() {
  console.log('📅 Initializing Events...');
  
  const eventsData = [
    {
      id: 'isha_gramotsavam_2025',
      name: 'Isha Gramotsavam 2025',
      description: 'Annual rural sports festival celebrating traditional games and community spirit',
      type: 'tournament',
      status: 'ongoing',
      startDate: safeDate('2025-03-01T06:00:00Z'),
      endDate: safeDate('2025-03-07T20:00:00Z'),
      registrationStartDate: safeDate('2025-01-01T00:00:00Z'),
      registrationEndDate: safeDate('2025-02-15T23:59:59Z'),
      venue: 'Isha Yoga Center Sports Complex',
      maxParticipants: 1000,
      currentParticipants: 756,
      sports: ['volleyball', 'throwball'],
      organizer: 'Isha Foundation',
      contact: {
        email: 'sports@isha.org',
        phone: '+91 9876543210'
      },
      rules: {
        ageLimit: { min: 16, max: 35 },
        teamSize: { volleyball: 8, throwball: 7 },
        registrationFee: 500
      },
      prizePool: {
        volleyball: { first: 50000, second: 30000, third: 20000 },
        throwball: { first: 50000, second: 30000, third: 20000 }
      },
      createdAt: safeDate('2024-12-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      id: 'pre_tournament_exhibition',
      name: 'Pre-Tournament Exhibition',
      description: 'Demonstration matches and skill showcases before the main tournament',
      type: 'exhibition',
      status: 'completed',
      startDate: safeDate('2025-02-20T09:00:00Z'),
      endDate: safeDate('2025-02-22T18:00:00Z'),
      registrationStartDate: safeDate('2025-01-15T00:00:00Z'),
      registrationEndDate: safeDate('2025-02-10T23:59:59Z'),
      venue: 'Community Center',
      maxParticipants: 200,
      currentParticipants: 180,
      sports: ['volleyball'],
      organizer: 'Local Sports Committee',
      contact: {
        email: 'exhibition@community.org',
        phone: '+91 9876543211'
      },
      createdAt: safeDate('2024-12-15T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      id: 'opening_ceremony',
      name: 'Opening Ceremony',
      description: 'Grand opening ceremony with cultural performances and torch lighting',
      type: 'ceremony',
      status: 'published',
      startDate: safeDate('2025-02-28T18:00:00Z'),
      endDate: safeDate('2025-02-28T21:00:00Z'),
      registrationStartDate: safeDate('2025-02-01T00:00:00Z'),
      registrationEndDate: safeDate('2025-02-25T23:59:59Z'),
      venue: 'Main Amphitheater',
      maxParticipants: 5000,
      currentParticipants: 3200,
      sports: [],
      organizer: 'Isha Foundation',
      contact: {
        email: 'ceremony@isha.org',
        phone: '+91 9876543210'
      },
      createdAt: safeDate('2025-01-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    }
  ];

  for (const event of eventsData) {
    await setDoc(doc(db, 'events', event.id), event);
  }
  
  console.log(`✅ Created ${eventsData.length} events`);
}

async function initializeSports() {
  console.log('🏐 Initializing Sports...');
  
  const sportsData = [
    {
      sportId: 'volleyball',
      name: 'Volleyball',
      description: 'Traditional 6-a-side volleyball with professional rules and regulations',
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
        skillLevel: 'all',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: safeDate('2025-01-01T00:00:00Z'),
        registrationEnd: safeDate('2025-02-15T23:59:59Z'),
        eventStart: safeDate('2025-03-01T09:00:00Z'),
        eventEnd: safeDate('2025-03-07T18:00:00Z'),
        registrationFee: 500,
        prizePool: {
          first: 50000,
          second: 30000,
          third: 20000
        }
      },
      rules: {
        format: '6v6',
        matchDuration: 'Best of 5 sets',
        pointSystem: 'Rally point system (25 points per set)',
        timeouts: '2 per set',
        substitutions: 'Unlimited'
      },
      assets: {
        primaryImage: '/images/sports/volleyball-men.jpg',
        gallery: ['/images/sports/volleyball-1.jpg', '/images/sports/volleyball-2.jpg'],
        rulesDocument: '/documents/volleyball-rules.pdf'
      },
      createdAt: safeDate('2024-12-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      sportId: 'volleyball_women',
      name: 'Volleyball',
      description: 'Traditional 6-a-side volleyball for women with professional rules and regulations',
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
        skillLevel: 'all',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: safeDate('2025-01-01T00:00:00Z'),
        registrationEnd: safeDate('2025-02-15T23:59:59Z'),
        eventStart: safeDate('2025-03-02T09:00:00Z'),
        eventEnd: safeDate('2025-03-06T18:00:00Z'),
        registrationFee: 500,
        prizePool: {
          first: 50000,
          second: 30000,
          third: 20000
        }
      },
      rules: {
        format: '6v6',
        matchDuration: 'Best of 5 sets',
        pointSystem: 'Rally point system (25 points per set)',
        timeouts: '2 per set',
        substitutions: 'Unlimited'
      },
      assets: {
        primaryImage: '/images/sports/volleyball-women.jpg',
        gallery: ['/images/sports/volleyball-women-1.jpg', '/images/sports/volleyball-women-2.jpg'],
        rulesDocument: '/documents/volleyball-rules.pdf'
      },
      createdAt: safeDate('2024-12-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      sportId: 'throwball',
      name: 'Throwball',
      description: 'Traditional throwball game for women with authentic rural sports rules',
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
        skillLevel: 'all',
        requirements: ['Valid ID proof', 'Medical certificate', 'Team photo']
      },
      eventInfo: {
        registrationStart: safeDate('2025-01-01T00:00:00Z'),
        registrationEnd: safeDate('2025-02-15T23:59:59Z'),
        eventStart: safeDate('2025-03-03T09:00:00Z'),
        eventEnd: safeDate('2025-03-07T17:00:00Z'),
        registrationFee: 500,
        prizePool: {
          first: 50000,
          second: 30000,
          third: 20000
        }
      },
      rules: {
        format: '7v7',
        matchDuration: 'Best of 3 sets (15 points each)',
        pointSystem: 'Traditional scoring',
        timeouts: '1 per set',
        substitutions: 'Limited substitutions'
      },
      assets: {
        primaryImage: '/images/sports/throwball.jpg',
        gallery: ['/images/sports/throwball-1.jpg', '/images/sports/throwball-2.jpg'],
        rulesDocument: '/documents/throwball-rules.pdf'
      },
      createdAt: safeDate('2024-12-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    }
  ];

  for (const sport of sportsData) {
    await setDoc(doc(db, 'sports', sport.sportId), sport);
  }
  
  console.log(`✅ Created ${sportsData.length} sports`);
}

async function initializeVenues() {
  console.log('🏟️ Initializing Venues...');
  
  const venuesData = [
    {
      id: 'isha_main_ground',
      name: 'Isha Sports Complex - Main Ground',
      description: 'Primary outdoor sports complex with multiple courts and professional facilities',
      type: 'outdoor',
      location: {
        address: 'Isha Yoga Center, Velliangiri Foothills',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641114',
        coordinates: {
          lat: 11.0168,
          lng: 76.9558
        }
      },
      capacity: 500,
      facilities: ['Changing Rooms', 'Parking', 'Cafeteria', 'First Aid', 'WiFi', 'Lighting', 'Sound System'],
      sports: ['volleyball', 'throwball'],
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
      images: ['/images/venues/isha-main-1.jpg', '/images/venues/isha-main-2.jpg'],
      createdAt: safeDate('2024-12-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      id: 'community_center_indoor',
      name: 'Community Center Indoor Courts',
      description: 'Modern indoor sports facility with air conditioning and professional amenities',
      type: 'indoor',
      location: {
        address: '123 Community Street, RS Puram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641002'
      },
      capacity: 200,
      facilities: ['Air Conditioning', 'Sound System', 'Changing Rooms', 'Parking', 'LED Lighting'],
      sports: ['volleyball'],
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
      images: ['/images/venues/community-indoor-1.jpg'],
      createdAt: safeDate('2024-12-15T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      id: 'government_stadium',
      name: 'Government Sports Stadium',
      description: 'Large outdoor stadium with professional-grade facilities and spectator seating',
      type: 'outdoor',
      location: {
        address: 'Stadium Road, Gandhipuram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641012'
      },
      capacity: 2000,
      facilities: ['VIP Seating', 'Media Center', 'Parking', 'Security', 'Medical Room', 'Press Box'],
      sports: ['volleyball', 'throwball'],
      status: 'maintenance',
      availability: {
        startTime: '07:00',
        endTime: '19:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      contact: {
        manager: 'Suresh Reddy',
        phone: '+91 9876543212',
        email: 'suresh@gov.tn.in'
      },
      pricing: {
        hourlyRate: 3000,
        fullDayRate: 25000
      },
      images: ['/images/venues/govt-stadium-1.jpg', '/images/venues/govt-stadium-2.jpg'],
      createdAt: safeDate('2024-11-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    }
  ];

  for (const venue of venuesData) {
    await setDoc(doc(db, 'venues', venue.id), venue);
  }
  
  console.log(`✅ Created ${venuesData.length} venues`);
}

async function initializeUsers() {
  console.log('👥 Initializing Sample Users...');
  
  const usersData = [
    {
      uid: 'admin_user_001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@isha.org',
      phone: '+91 9876543218',
      role: 'admin',
      status: 'active',
      isProfileComplete: true,
      verificationStatus: 'verified',
      dateOfBirth: safeDate('1985-01-01'),
      gender: 'male',
      address: {
        street: 'Isha Yoga Center',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641114'
      },
      emergencyContact: {
        name: 'System Admin',
        relationship: 'System',
        phone: '+91 9876543219'
      },
      documents: {
        profilePhoto: '/profiles/admin.jpg'
      },
      teams: [],
      joinDate: safeDate('2024-01-01T00:00:00Z'),
      lastLogin: serverTimestamp(),
      loginCount: 250,
      createdAt: safeDate('2024-01-01T00:00:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      uid: 'captain_001',
      firstName: 'Arjun',
      lastName: 'Singh',
      email: 'arjun.singh@email.com',
      phone: '+91 9876543210',
      role: 'captain',
      status: 'active',
      isProfileComplete: true,
      verificationStatus: 'verified',
      dateOfBirth: safeDate('1995-03-15'),
      gender: 'male',
      address: {
        street: '123 MG Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001'
      },
      emergencyContact: {
        name: 'Rajesh Singh',
        relationship: 'Father',
        phone: '+91 9876543211'
      },
      documents: {
        profilePhoto: '/profiles/arjun.jpg',
        idProof: '/documents/arjun_id.pdf',
        addressProof: '/documents/arjun_address.pdf'
      },
      teams: ['thunder_bolts'],
      joinDate: safeDate('2024-12-15T10:30:00Z'),
      lastLogin: serverTimestamp(),
      loginCount: 45,
      createdAt: safeDate('2024-12-15T10:30:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      uid: 'captain_002',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@email.com',
      phone: '+91 9876543212',
      role: 'captain',
      status: 'active',
      isProfileComplete: true,
      verificationStatus: 'verified',
      dateOfBirth: safeDate('1993-07-22'),
      gender: 'female',
      address: {
        street: '456 Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001'
      },
      emergencyContact: {
        name: 'Sunita Sharma',
        relationship: 'Mother',
        phone: '+91 9876543213'
      },
      documents: {
        profilePhoto: '/profiles/priya.jpg',
        idProof: '/documents/priya_id.pdf',
        addressProof: '/documents/priya_address.pdf'
      },
      teams: ['lightning_strikers'],
      joinDate: safeDate('2024-12-20T09:15:00Z'),
      lastLogin: serverTimestamp(),
      loginCount: 32,
      createdAt: safeDate('2024-12-20T09:15:00Z'),
      updatedAt: serverTimestamp()
    }
  ];

  for (const user of usersData) {
    await setDoc(doc(db, 'users', user.uid), user);
  }
  
  console.log(`✅ Created ${usersData.length} sample users`);
}

async function initializeTeams() {
  console.log('🏆 Initializing Sample Teams...');
  
  const teamsData = [
    {
      id: 'thunder_bolts',
      name: 'Thunder Bolts',
      sport: 'volleyball',
      category: 'men',
      captainId: 'captain_001',
      captain: {
        firstName: 'Arjun',
        lastName: 'Singh',
        email: 'arjun.singh@email.com',
        phone: '+91 9876543210'
      },
      players: [
        {
          id: 'captain_001',
          firstName: 'Arjun',
          lastName: 'Singh',
          email: 'arjun.singh@email.com',
          role: 'player',
          verified: true,
          position: 'captain'
        }
        // Add more players as needed
      ],
      venue: 'isha_main_ground',
      status: 'verified',
      verificationStatus: 'verified',
      registrationDate: safeDate('2025-01-15T10:30:00Z'),
      lastUpdated: serverTimestamp(),
      documents: {
        teamPhoto: '/documents/thunder_bolts_photo.jpg',
        captainId: '/documents/arjun_id.pdf',
        additionalDocs: []
      },
      stats: {
        matchesPlayed: 5,
        wins: 4,
        losses: 1,
        points: 12
      },
      createdAt: safeDate('2025-01-15T10:30:00Z'),
      updatedAt: serverTimestamp()
    },
    {
      id: 'lightning_strikers',
      name: 'Lightning Strikers',
      sport: 'volleyball',
      category: 'women',
      captainId: 'captain_002',
      captain: {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91 9876543212'
      },
      players: [
        {
          id: 'captain_002',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya.sharma@email.com',
          role: 'player',
          verified: true,
          position: 'captain'
        }
        // Add more players as needed
      ],
      venue: 'community_center_indoor',
      status: 'registered',
      verificationStatus: 'in_review',
      registrationDate: safeDate('2025-01-18T09:15:00Z'),
      lastUpdated: serverTimestamp(),
      documents: {
        teamPhoto: '/documents/lightning_strikers_photo.jpg',
        captainId: '/documents/priya_id.pdf',
        additionalDocs: []
      },
      stats: {
        matchesPlayed: 3,
        wins: 2,
        losses: 1,
        points: 6
      },
      createdAt: safeDate('2025-01-18T09:15:00Z'),
      updatedAt: serverTimestamp()
    }
  ];

  for (const team of teamsData) {
    await setDoc(doc(db, 'teams', team.id), team);
  }
  
  console.log(`✅ Created ${teamsData.length} sample teams`);
}

async function initializeSystemConfig() {
  console.log('⚙️ Initializing System Configuration...');
  
  const systemConfig = {
    id: 'main_config',
    eventSettings: {
      currentEvent: 'isha_gramotsavam_2025',
      registrationOpen: true,
      maxTeamsPerSport: 64,
      registrationFee: 500,
      lateRegistrationFee: 750
    },
    paymentSettings: {
      enabled: true,
      methods: ['razorpay', 'upi', 'netbanking'],
      currency: 'INR',
      refundPolicy: 'No refunds after team verification'
    },
    verificationSettings: {
      autoVerification: false,
      requiredDocuments: ['teamPhoto', 'captainId', 'playerIds'],
      verificationTimeoutDays: 7
    },
    notificationSettings: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true
    },
    systemLimits: {
      maxFileSize: 5242880, // 5MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      maxPlayersPerTeam: 12,
      minPlayersPerTeam: 6
    },
    maintenanceMode: false,
    version: '1.0.0',
    lastUpdated: serverTimestamp(),
    createdAt: safeDate('2024-12-01T00:00:00Z')
  };

  await setDoc(doc(db, 'system', 'config'), systemConfig);
  
  // Initialize analytics collection with sample data
  const analyticsData = {
    id: 'current_stats',
    overview: {
      totalUsers: 1247,
      totalTeams: 156,
      totalRegistrations: 1403,
      totalEvents: 3,
      activeUsers: 892
    },
    lastCalculated: serverTimestamp(),
    createdAt: safeDate('2025-01-01T00:00:00Z'),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'analytics', 'overview'), analyticsData);
  
  console.log('✅ System configuration initialized');
}

// Run the initialization
initializeDatabase().catch(console.error);

module.exports = {
  initializeDatabase,
  initializeEvents,
  initializeSports,
  initializeVenues,
  initializeUsers,
  initializeTeams,
  initializeSystemConfig
};