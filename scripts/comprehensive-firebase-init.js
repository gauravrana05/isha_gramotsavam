#!/usr/bin/env node

/**
 * Comprehensive Firebase Database Initialization for Isha Gramotsavam
 * Based on the detailed Firestore schema with Gramotsavam-specific requirements
 * 
 * Features:
 * - Panchayat-based eligibility and geographic restrictions
 * - Multi-level tournament structure (cluster → division → final)
 * - Age restrictions and detailed player eligibility
 * - Comprehensive user profiles with document management
 * - Advanced venue management with facilities
 * - Match scheduling and fixtures system
 * - Media management and notifications
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp, Timestamp } = require('firebase/firestore');

// Firebase configuration - Update with your actual config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "isha-gramotsavam.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "isha-gramotsavam",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "isha-gramotsavam.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:example-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🚀 Starting Comprehensive Isha Gramotsavam Firebase Setup...\n');

async function setupComprehensiveDatabase() {
  try {
    console.log('📅 Setting up Events with tournament structure...');
    await setupEvents();
    
    console.log('🏐 Setting up Sports with detailed eligibility rules...');
    await setupSports();
    
    console.log('👥 Setting up comprehensive User profiles...');
    await setupUsers();
    
    console.log('🏆 Setting up Teams with player management...');
    await setupTeams();
    
    console.log('🏟️ Setting up Venues with detailed facilities...');
    await setupVenues();
    
    console.log('📋 Setting up Fixtures and match scheduling...');
    await setupFixtures();
    
    console.log('🎯 Setting up Matches with live scoring...');
    await setupMatches();
    
    console.log('📱 Setting up Media and notifications...');
    await setupMediaAndNotifications();
    
    console.log('📊 Setting up Analytics and audit logs...');
    await setupAnalyticsAndAudit();
    
    console.log('⚙️ Setting up System configuration...');
    await setupSystemConfig();
    
    console.log('\n✅ Comprehensive database setup completed successfully!');
    console.log('\n🎉 Isha Gramotsavam 2025 with full schema is ready!');
    
  } catch (error) {
    console.error('\n❌ Error setting up comprehensive database:', error);
    process.exit(1);
  }
}

async function setupEvents() {
  const eventsData = [
    {
      id: 'isha_gramotsavam_2025',
      name: 'Isha Gramotsavam 2025',
      description: 'Annual rural sports festival celebrating traditional games and community spirit with panchayat-based participation',
      longDescription: 'Isha Gramotsavam is a comprehensive rural sports festival that promotes traditional Indian games while fostering community participation through panchayat-based eligibility. The tournament follows a multi-level structure from cluster to division to final championships.',
      type: 'tournament',
      status: 'registration_open',
      startDate: Timestamp.fromDate(new Date('2025-03-01T06:00:00Z')),
      endDate: Timestamp.fromDate(new Date('2025-03-15T20:00:00Z')),
      registrationStartDate: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
      registrationEndDate: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
      
      // Tournament Structure
      tournamentStructure: {
        levels: [
          {
            id: 'cluster',
            name: 'Cluster Level',
            description: 'Local cluster competitions within panchayats',
            startDate: Timestamp.fromDate(new Date('2025-03-01T09:00:00Z')),
            endDate: Timestamp.fromDate(new Date('2025-03-05T18:00:00Z')),
            maxTeams: 32,
            qualificationCriteria: 'Top 2 teams from each cluster advance'
          },
          {
            id: 'division',
            name: 'Division Level',
            description: 'Regional division championships',
            startDate: Timestamp.fromDate(new Date('2025-03-08T09:00:00Z')),
            endDate: Timestamp.fromDate(new Date('2025-03-12T18:00:00Z')),
            maxTeams: 16,
            qualificationCriteria: 'Top 2 teams from each division advance'
          },
          {
            id: 'final',
            name: 'Final Championship',
            description: 'Grand finale with top teams',
            startDate: Timestamp.fromDate(new Date('2025-03-14T10:00:00Z')),
            endDate: Timestamp.fromDate(new Date('2025-03-15T18:00:00Z')),
            maxTeams: 8,
            qualificationCriteria: 'Championship rounds'
          }
        ],
        format: 'knockout_with_playoffs',
        totalRounds: 3
      },

      // Geographic and Eligibility Rules
      eligibilityRules: {
        geographic: {
          panchayatBased: true,
          allowedStates: ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh'],
          restrictionType: 'panchayat_residence',
          residenceVerificationRequired: true
        },
        age: {
          general: { min: 16, max: 35 },
          under21Limit: {
            maxPlayersUnder21: 3,
            description: 'Maximum 3 players under 21 per team'
          }
        },
        documentation: [
          'Valid government ID proof',
          'Panchayat residence certificate',
          'Age proof certificate',
          'Medical fitness certificate',
          'Team photograph'
        ]
      },

      sports: ['volleyball_men', 'volleyball_women', 'throwball_women'],
      maxParticipants: 2000,
      currentParticipants: 0,
      totalPrizePool: 500000,
      registrationFee: 750,

      organizer: {
        name: 'Isha Foundation',
        contact: {
          email: 'gramotsavam@isha.org',
          phone: '+91 422 2515345',
          website: 'https://isha.sadhguru.org/gramotsavam'
        },
        address: {
          street: 'Isha Yoga Center, Velliangiri Foothills',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641114'
        }
      },

      venues: ['isha_main_complex', 'community_center_indoor', 'district_stadium'],
      
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const event of eventsData) {
    await setDoc(doc(db, 'events', event.id), event);
    console.log(`   ✅ Event created: ${event.name}`);
  }
}

async function setupSports() {
  const sportsData = [
    {
      id: 'volleyball_men',
      name: 'Volleyball (Men)',
      description: 'Professional 6-a-side volleyball for men with traditional rules',
      category: 'men',
      status: 'active',
      
      teamConfiguration: {
        playingPlayers: 6,
        totalSquadSize: 12,
        maxSubstitutes: 6,
        minPlayersForMatch: 6,
        maxPlayersOnCourt: 6
      },

      eligibility: {
        age: { min: 16, max: 35 },
        gender: 'male',
        under21Restriction: {
          maxAllowed: 3,
          description: 'Maximum 3 players under 21 years'
        },
        geographic: {
          panchayatRestriction: true,
          residenceProofRequired: true,
          allowedRegions: ['rural', 'semi_urban']
        },
        physical: {
          medicalCertificateRequired: true,
          fitnessTestRequired: false
        }
      },

      tournamentRules: {
        matchFormat: 'best_of_5_sets',
        pointsPerSet: 25,
        finalSetPoints: 15,
        timeoutsPerSet: 2,
        substitutionRules: 'unlimited_with_same_player',
        matchDuration: '90_minutes_max'
      },

      eventSchedule: {
        registrationStart: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
        registrationEnd: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
        eventStart: Timestamp.fromDate(new Date('2025-03-01T09:00:00Z')),
        eventEnd: Timestamp.fromDate(new Date('2025-03-15T18:00:00Z'))
      },

      prizeDistribution: {
        winner: 100000,
        runnerUp: 60000,
        thirdPlace: 40000,
        participation: 10000,
        bestPlayer: 15000
      },

      requiredDocuments: [
        'team_photograph',
        'captain_id_proof',
        'all_players_id_proof',
        'age_certificates',
        'panchayat_residence_certificates',
        'medical_certificates'
      ],

      assets: {
        primaryImage: '/images/sports/volleyball-men-main.jpg',
        gallery: [
          '/images/sports/volleyball-men-action-1.jpg',
          '/images/sports/volleyball-men-action-2.jpg',
          '/images/sports/volleyball-court-setup.jpg'
        ],
        rulesDocument: '/documents/volleyball-men-official-rules.pdf',
        registrationGuide: '/documents/volleyball-men-registration-guide.pdf'
      },

      registrationFee: 750,
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    },

    {
      id: 'volleyball_women',
      name: 'Volleyball (Women)',
      description: 'Professional 6-a-side volleyball for women with traditional rules',
      category: 'women',
      status: 'active',
      
      teamConfiguration: {
        playingPlayers: 6,
        totalSquadSize: 12,
        maxSubstitutes: 6,
        minPlayersForMatch: 6,
        maxPlayersOnCourt: 6
      },

      eligibility: {
        age: { min: 16, max: 35 },
        gender: 'female',
        under21Restriction: {
          maxAllowed: 3,
          description: 'Maximum 3 players under 21 years'
        },
        geographic: {
          panchayatRestriction: true,
          residenceProofRequired: true,
          allowedRegions: ['rural', 'semi_urban']
        },
        physical: {
          medicalCertificateRequired: true,
          fitnessTestRequired: false
        }
      },

      tournamentRules: {
        matchFormat: 'best_of_5_sets',
        pointsPerSet: 25,
        finalSetPoints: 15,
        timeoutsPerSet: 2,
        substitutionRules: 'unlimited_with_same_player',
        matchDuration: '90_minutes_max'
      },

      eventSchedule: {
        registrationStart: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
        registrationEnd: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
        eventStart: Timestamp.fromDate(new Date('2025-03-02T09:00:00Z')),
        eventEnd: Timestamp.fromDate(new('2025-03-14T18:00:00Z'))
      },

      prizeDistribution: {
        winner: 100000,
        runnerUp: 60000,
        thirdPlace: 40000,
        participation: 10000,
        bestPlayer: 15000
      },

      requiredDocuments: [
        'team_photograph',
        'captain_id_proof',
        'all_players_id_proof',
        'age_certificates',
        'panchayat_residence_certificates',
        'medical_certificates'
      ],

      assets: {
        primaryImage: '/images/sports/volleyball-women-main.jpg',
        gallery: [
          '/images/sports/volleyball-women-action-1.jpg',
          '/images/sports/volleyball-women-action-2.jpg',
          '/images/sports/volleyball-court-setup.jpg'
        ],
        rulesDocument: '/documents/volleyball-women-official-rules.pdf',
        registrationGuide: '/documents/volleyball-women-registration-guide.pdf'
      },

      registrationFee: 750,
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    },

    {
      id: 'throwball_women',
      name: 'Throwball (Women)',
      description: 'Traditional 7-a-side throwball for women - authentic rural sport',
      category: 'women',
      status: 'active',
      
      teamConfiguration: {
        playingPlayers: 7,
        totalSquadSize: 12,
        maxSubstitutes: 5,
        minPlayersForMatch: 7,
        maxPlayersOnCourt: 7
      },

      eligibility: {
        age: { min: 16, max: 35 },
        gender: 'female',
        under21Restriction: {
          maxAllowed: 3,
          description: 'Maximum 3 players under 21 years'
        },
        geographic: {
          panchayatRestriction: true,
          residenceProofRequired: true,
          allowedRegions: ['rural', 'semi_urban']
        },
        physical: {
          medicalCertificateRequired: true,
          fitnessTestRequired: false
        }
      },

      tournamentRules: {
        matchFormat: 'best_of_3_sets',
        pointsPerSet: 15,
        finalSetPoints: 15,
        timeoutsPerSet: 1,
        substitutionRules: 'max_3_per_set',
        matchDuration: '60_minutes_max'
      },

      eventSchedule: {
        registrationStart: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
        registrationEnd: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
        eventStart: Timestamp.fromDate(new Date('2025-03-03T09:00:00Z')),
        eventEnd: Timestamp.fromDate(new Date('2025-03-15T17:00:00Z'))
      },

      prizeDistribution: {
        winner: 100000,
        runnerUp: 60000,
        thirdPlace: 40000,
        participation: 10000,
        bestPlayer: 15000
      },

      requiredDocuments: [
        'team_photograph',
        'captain_id_proof',
        'all_players_id_proof',
        'age_certificates',
        'panchayat_residence_certificates',
        'medical_certificates'
      ],

      assets: {
        primaryImage: '/images/sports/throwball-main.jpg',
        gallery: [
          '/images/sports/throwball-action-1.jpg',
          '/images/sports/throwball-action-2.jpg',
          '/images/sports/throwball-court-setup.jpg'
        ],
        rulesDocument: '/documents/throwball-official-rules.pdf',
        registrationGuide: '/documents/throwball-registration-guide.pdf'
      },

      registrationFee: 750,
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const sport of sportsData) {
    await setDoc(doc(db, 'sports', sport.id), sport);
    console.log(`   ✅ Sport created: ${sport.name}`);
  }
}

async function setupUsers() {
  const usersData = [
    {
      uid: 'admin_gramotsavam_001',
      personalInfo: {
        firstName: 'Admin',
        lastName: 'Gramotsavam',
        email: 'admin@isha.org',
        phone: '+91 9876543200',
        dateOfBirth: Timestamp.fromDate(new Date('1985-05-15')),
        gender: 'male',
        profilePhoto: '/profiles/admin-gramotsavam.jpg'
      },
      
      address: {
        street: 'Isha Yoga Center Administrative Block',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641114',
        panchayat: 'Velliangiri Panchayat',
        district: 'Coimbatore',
        coordinates: {
          latitude: 11.0168,
          longitude: 76.9558
        }
      },

      role: 'admin',
      permissions: [
        'user_management',
        'team_management',
        'event_management',
        'venue_management',
        'analytics_access',
        'system_configuration'
      ],

      accountStatus: 'active',
      verificationStatus: 'verified',
      profileCompletionStatus: 'complete',

      documents: {
        profilePhoto: {
          url: '/documents/admin/profile-photo.jpg',
          uploadedAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
          verified: true
        },
        idProof: {
          type: 'aadhar',
          url: '/documents/admin/aadhar.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
          verified: true
        },
        addressProof: {
          type: 'utility_bill',
          url: '/documents/admin/address-proof.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
          verified: true
        }
      },

      emergencyContact: {
        name: 'System Administrator',
        relationship: 'colleague',
        phone: '+91 422 2515345',
        email: 'sysadmin@isha.org'
      },

      preferences: {
        language: 'english',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        privacy: {
          profileVisible: false,
          contactVisible: false
        }
      },

      activityLog: {
        createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
        lastLogin: serverTimestamp(),
        loginCount: 350,
        lastActivity: serverTimestamp()
      },

      teams: [],
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    },

    // Sample Team Captain
    {
      uid: 'captain_rural_001',
      personalInfo: {
        firstName: 'Murugan',
        lastName: 'Selvam',
        email: 'murugan.selvam@gmail.com',
        phone: '+91 9876543201',
        dateOfBirth: Timestamp.fromDate(new Date('1992-08-22')),
        gender: 'male',
        profilePhoto: '/profiles/murugan-selvam.jpg'
      },
      
      address: {
        street: '45 Panchayat Road, Kondampatti Village',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641109',
        panchayat: 'Kondampatti Panchayat',
        district: 'Coimbatore',
        village: 'Kondampatti',
        coordinates: {
          latitude: 11.0890,
          longitude: 76.9950
        }
      },

      role: 'captain',
      permissions: [
        'team_management',
        'player_registration',
        'document_upload'
      ],

      accountStatus: 'active',
      verificationStatus: 'verified',
      profileCompletionStatus: 'complete',

      documents: {
        profilePhoto: {
          url: '/documents/captain_001/profile-photo.jpg',
          uploadedAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
          verified: true
        },
        idProof: {
          type: 'aadhar',
          number: 'XXXX-XXXX-1234',
          url: '/documents/captain_001/aadhar.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
          verified: true
        },
        addressProof: {
          type: 'panchayat_certificate',
          url: '/documents/captain_001/panchayat-certificate.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
          verified: true
        },
        ageProof: {
          type: 'birth_certificate',
          url: '/documents/captain_001/birth-certificate.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
          verified: true
        },
        medicalCertificate: {
          url: '/documents/captain_001/medical-certificate.pdf',
          uploadedAt: Timestamp.fromDate(new Date('2025-01-15T00:00:00Z')),
          verified: true,
          validUntil: Timestamp.fromDate(new Date('2025-12-31T00:00:00Z'))
        }
      },

      emergencyContact: {
        name: 'Kamala Selvam',
        relationship: 'spouse',
        phone: '+91 9876543202',
        email: 'kamala.selvam@gmail.com'
      },

      preferences: {
        language: 'tamil',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        privacy: {
          profileVisible: true,
          contactVisible: false
        }
      },

      sportsPreferences: ['volleyball_men'],
      experience: {
        yearsPlaying: 8,
        previousTournaments: 5,
        achievements: ['District Level Winner 2023', 'Regional Participant 2024']
      },

      activityLog: {
        createdAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
        lastLogin: serverTimestamp(),
        loginCount: 25,
        lastActivity: serverTimestamp()
      },

      teams: ['rural_warriors_001'],
      createdAt: Timestamp.fromDate(new Date('2025-01-10T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const user of usersData) {
    await setDoc(doc(db, 'users', user.uid), user);
    console.log(`   ✅ User created: ${user.personalInfo.firstName} ${user.personalInfo.lastName}`);
  }
}

async function setupTeams() {
  const teamsData = [
    {
      id: 'rural_warriors_001',
      basicInfo: {
        name: 'Rural Warriors',
        sport: 'volleyball_men',
        category: 'men'
      },

      captain: {
        userId: 'captain_rural_001',
        name: 'Murugan Selvam',
        email: 'murugan.selvam@gmail.com',
        phone: '+91 9876543201'
      },

      players: [
        {
          userId: 'captain_rural_001',
          name: 'Murugan Selvam',
          position: 'captain',
          dateOfBirth: Timestamp.fromDate(new Date('1992-08-22')),
          age: 32,
          verified: true,
          documents: {
            idProof: '/documents/captain_001/aadhar.pdf',
            ageProof: '/documents/captain_001/birth-certificate.pdf',
            medicalCertificate: '/documents/captain_001/medical-certificate.pdf',
            panchayatCertificate: '/documents/captain_001/panchayat-certificate.pdf'
          }
        }
        // Additional players would be added here
      ],

      eligibilityStatus: {
        ageCompliance: {
          compliant: true,
          under21Count: 1,
          averageAge: 28.5
        },
        geographicCompliance: {
          compliant: true,
          panchayat: 'Kondampatti Panchayat',
          district: 'Coimbatore',
          verifiedPlayers: 1
        },
        documentCompliance: {
          compliant: false, // Needs all players to be added
          missingDocuments: ['team_photograph', 'all_player_documents']
        }
      },

      registrationInfo: {
        registrationDate: Timestamp.fromDate(new Date('2025-01-20T10:30:00Z')),
        registrationFee: 750,
        paymentStatus: 'pending',
        paymentMethod: null,
        transactionId: null
      },

      verificationStatus: {
        status: 'pending',
        submittedAt: Timestamp.fromDate(new Date('2025-01-20T10:30:00Z')),
        verifiedAt: null,
        verifiedBy: null,
        remarks: 'Waiting for complete team registration'
      },

      tournamentLevel: 'cluster',
      assignedVenue: null,
      
      matchHistory: [],
      statistics: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0
      },

      documents: {
        teamPhotograph: null,
        captainIdProof: '/documents/captain_001/aadhar.pdf',
        playersDocuments: [],
        additionalDocuments: []
      },

      createdAt: Timestamp.fromDate(new Date('2025-01-20T10:30:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const team of teamsData) {
    await setDoc(doc(db, 'teams', team.id), team);
    console.log(`   ✅ Team created: ${team.basicInfo.name}`);
  }
}

async function setupVenues() {
  const venuesData = [
    {
      id: 'isha_main_complex',
      basicInfo: {
        name: 'Isha Sports Complex - Main Arena',
        description: 'State-of-the-art sports complex with multiple courts and comprehensive facilities',
        type: 'outdoor_complex'
      },

      location: {
        address: 'Isha Yoga Center, Velliangiri Foothills',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641114',
        district: 'Coimbatore',
        coordinates: {
          latitude: 11.0168,
          longitude: 76.9558
        },
        accessibility: {
          publicTransport: true,
          parking: true,
          wheelchairAccessible: true
        }
      },

      capacity: {
        seating: 800,
        standing: 200,
        total: 1000,
        vipSeating: 50
      },

      facilities: {
        courts: [
          {
            courtId: 'court_1',
            sport: 'volleyball',
            surface: 'synthetic',
            dimensions: '18m x 9m',
            lighting: 'LED_professional',
            scoreboard: true
          },
          {
            courtId: 'court_2',
            sport: 'volleyball',
            surface: 'synthetic',
            dimensions: '18m x 9m',
            lighting: 'LED_professional',
            scoreboard: true
          },
          {
            courtId: 'court_3',
            sport: 'throwball',
            surface: 'concrete',
            dimensions: '12.2m x 18.3m',
            lighting: 'LED_professional',
            scoreboard: true
          }
        ],
        amenities: [
          'changing_rooms_men',
          'changing_rooms_women',
          'referee_room',
          'first_aid_station',
          'cafeteria',
          'prayer_room',
          'parking_500_vehicles',
          'wifi_coverage',
          'live_streaming_setup',
          'public_announcement_system'
        ],
        safety: [
          'fire_extinguishers',
          'emergency_exits',
          'security_cameras',
          'medical_room',
          'ambulance_access'
        ]
      },

      operationalInfo: {
        operatingHours: {
          weekdays: { start: '06:00', end: '22:00' },
          weekends: { start: '06:00', end: '22:00' }
        },
        staffing: {
          manager: 'Rajesh Kumar',
          assistantManager: 'Priya Nair',
          securityOfficer: 'Subramanian R',
          maintenanceHead: 'Ganesh M'
        },
        contact: {
          phone: '+91 422 2515345',
          email: 'venue@isha.org',
          emergencyPhone: '+91 9876543333'
        }
      },

      sportsSupported: ['volleyball_men', 'volleyball_women', 'throwball_women'],
      status: 'active',
      
      images: [
        '/images/venues/isha-complex-main.jpg',
        '/images/venues/isha-complex-courts.jpg',
        '/images/venues/isha-complex-facilities.jpg'
      ],

      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const venue of venuesData) {
    await setDoc(doc(db, 'venues', venue.id), venue);
    console.log(`   ✅ Venue created: ${venue.basicInfo.name}`);
  }
}

async function setupFixtures() {
  const fixturesData = [
    {
      id: 'gramotsavam_2025_cluster_volleyball_men',
      tournamentInfo: {
        eventId: 'isha_gramotsavam_2025',
        sport: 'volleyball_men',
        level: 'cluster',
        phase: 'preliminary'
      },

      schedule: {
        startDate: Timestamp.fromDate(new Date('2025-03-01T09:00:00Z')),
        endDate: Timestamp.fromDate(new Date('2025-03-05T18:00:00Z')),
        matchDuration: 90, // minutes
        breakBetweenMatches: 30 // minutes
      },

      venues: ['isha_main_complex'],
      
      matches: [
        // Sample matches would be generated based on team registrations
      ],

      rules: {
        format: 'round_robin_then_knockout',
        groupStage: {
          teamsPerGroup: 4,
          matchesPerTeam: 3,
          qualificationCriteria: 'top_2_per_group'
        },
        knockoutStage: {
          format: 'single_elimination',
          thirdPlaceMatch: true
        }
      },

      status: 'scheduled',
      createdAt: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const fixture of fixturesData) {
    await setDoc(doc(db, 'fixtures', fixture.id), fixture);
    console.log(`   ✅ Fixture created: ${fixture.id}`);
  }
}

async function setupMatches() {
  // Sample match data structure
  const matchesData = [
    {
      id: 'match_001_cluster_vb_men',
      fixtureId: 'gramotsavam_2025_cluster_volleyball_men',
      
      matchInfo: {
        matchNumber: 1,
        sport: 'volleyball_men',
        level: 'cluster',
        phase: 'group_stage',
        group: 'A'
      },

      teams: {
        team1: {
          id: 'rural_warriors_001',
          name: 'Rural Warriors'
        },
        team2: {
          id: 'tbd', // To be determined based on registrations
          name: 'TBD'
        }
      },

      schedule: {
        scheduledDate: Timestamp.fromDate(new Date('2025-03-01T10:00:00Z')),
        actualStartTime: null,
        actualEndTime: null,
        duration: null
      },

      venue: {
        id: 'isha_main_complex',
        courtId: 'court_1'
      },

      officials: {
        referee: null,
        linesmen: [],
        scorer: null
      },

      status: 'scheduled', // scheduled, in_progress, completed, cancelled
      
      result: null, // Will be populated after match completion
      
      liveScore: {
        currentSet: 0,
        team1Score: { sets: 0, currentSetPoints: 0 },
        team2Score: { sets: 0, currentSetPoints: 0 },
        setScores: []
      },

      createdAt: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const match of matchesData) {
    await setDoc(doc(db, 'matches', match.id), match);
    console.log(`   ✅ Match created: ${match.id}`);
  }
}

async function setupMediaAndNotifications() {
  // Sample media collection
  const mediaData = [
    {
      id: 'media_001',
      type: 'image',
      category: 'event_promotion',
      
      fileInfo: {
        fileName: 'gramotsavam-2025-banner.jpg',
        url: '/media/images/gramotsavam-2025-banner.jpg',
        size: 2048576, // 2MB
        dimensions: { width: 1920, height: 1080 },
        format: 'JPEG'
      },

      metadata: {
        title: 'Isha Gramotsavam 2025 Official Banner',
        description: 'Main promotional banner for Isha Gramotsavam 2025',
        tags: ['banner', 'promotion', '2025', 'gramotsavam'],
        eventId: 'isha_gramotsavam_2025'
      },

      uploadInfo: {
        uploadedBy: 'admin_gramotsavam_001',
        uploadedAt: Timestamp.fromDate(new Date('2024-12-15T00:00:00Z')),
        approvedBy: 'admin_gramotsavam_001',
        approvedAt: Timestamp.fromDate(new Date('2024-12-15T00:00:00Z'))
      },

      visibility: 'public',
      status: 'approved',
      
      createdAt: Timestamp.fromDate(new Date('2024-12-15T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const media of mediaData) {
    await setDoc(doc(db, 'media', media.id), media);
    console.log(`   ✅ Media created: ${media.id}`);
  }

  // Sample notification templates
  const notificationData = [
    {
      id: 'welcome_captain',
      title: 'Welcome to Isha Gramotsavam 2025!',
      template: 'Welcome {captain_name}! Your registration as team captain has been successful. Team ID: {team_id}. Next step: Complete your team registration.',
      type: 'system',
      category: 'registration',
      channels: ['email', 'sms'],
      status: 'active',
      createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
      updatedAt: serverTimestamp()
    }
  ];

  for (const notification of notificationData) {
    await setDoc(doc(db, 'notifications', notification.id), notification);
    console.log(`   ✅ Notification template created: ${notification.id}`);
  }
}

async function setupAnalyticsAndAudit() {
  // Analytics overview
  const analyticsData = {
    id: 'overview_current',
    eventId: 'isha_gramotsavam_2025',
    
    registrationStats: {
      totalRegistrations: 0,
      completedRegistrations: 0,
      pendingVerifications: 0,
      verifiedTeams: 0,
      rejectedApplications: 0
    },

    participationStats: {
      totalPlayers: 0,
      maleParticipants: 0,
      femaleParticipants: 0,
      under21Participants: 0,
      averageAge: 0
    },

    geographicStats: {
      participatingPanchayats: 0,
      participatingDistricts: 0,
      participatingStates: 0,
      topParticipatingRegions: []
    },

    sportsStats: {
      volleyball_men: { teams: 0, players: 0 },
      volleyball_women: { teams: 0, players: 0 },
      throwball_women: { teams: 0, players: 0 }
    },

    lastUpdated: serverTimestamp(),
    createdAt: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'))
  };

  await setDoc(doc(db, 'analytics', 'overview'), analyticsData);
  console.log('   ✅ Analytics overview created');

  // Sample audit log
  const auditData = [
    {
      id: 'audit_001',
      eventType: 'database_initialization',
      entityType: 'system',
      entityId: 'comprehensive_setup',
      
      action: 'create',
      description: 'Comprehensive database initialization completed',
      
      userInfo: {
        userId: 'system',
        userRole: 'system',
        userEmail: 'system@isha.org'
      },

      metadata: {
        collections_created: ['events', 'sports', 'users', 'teams', 'venues', 'fixtures', 'matches', 'media', 'notifications', 'analytics'],
        setup_type: 'comprehensive',
        version: '1.0.0'
      },

      timestamp: serverTimestamp(),
      ipAddress: '127.0.0.1',
      userAgent: 'Firebase-Init-Script/1.0'
    }
  ];

  for (const audit of auditData) {
    await setDoc(doc(db, 'audit_logs', audit.id), audit);
    console.log(`   ✅ Audit log created: ${audit.id}`);
  }
}

async function setupSystemConfig() {
  const systemConfig = {
    id: 'main_config',
    
    eventSettings: {
      currentEvent: 'isha_gramotsavam_2025',
      registrationOpen: true,
      maxTeamsPerSport: 128,
      registrationFee: 750,
      lateRegistrationFee: 1000,
      registrationDeadline: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z'))
    },

    eligibilitySettings: {
      ageRestrictions: {
        minAge: 16,
        maxAge: 35,
        maxUnder21Players: 3
      },
      geographicRestrictions: {
        panchayatBased: true,
        allowedStates: ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh'],
        residenceVerificationRequired: true
      },
      requiredDocuments: {
        individual: ['id_proof', 'age_proof', 'medical_certificate', 'panchayat_certificate'],
        team: ['team_photograph', 'captain_documents', 'all_player_documents']
      }
    },

    tournamentSettings: {
      structure: 'cluster_division_final',
      levels: 3,
      matchFormat: {
        volleyball: 'best_of_5_sets',
        throwball: 'best_of_3_sets'
      }
    },

    paymentSettings: {
      enabled: true,
      methods: ['razorpay', 'upi', 'netbanking', 'card'],
      currency: 'INR',
      refundPolicy: 'no_refunds_after_verification'
    },

    verificationSettings: {
      autoVerification: false,
      manualReviewRequired: true,
      verificationTimeoutDays: 5,
      documentsRequired: true
    },

    systemLimits: {
      maxFileSize: 10485760, // 10MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      maxPlayersPerTeam: 12,
      minPlayersPerTeam: 6,
      maxTeamNameLength: 50
    },

    notificationSettings: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      defaultLanguage: 'english',
      supportedLanguages: ['english', 'tamil', 'hindi']
    },

    maintenanceMode: false,
    version: '2.0.0',
    
    createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'system_config', 'main'), systemConfig);
  console.log('   ✅ System configuration created');
}

// Run the comprehensive setup
if (require.main === module) {
  setupComprehensiveDatabase()
    .then(() => {
      console.log('\n🏆 Isha Gramotsavam 2025 Comprehensive Database Ready!');
      console.log('\n📋 What has been set up:');
      console.log('   ✅ Events with multi-level tournament structure');
      console.log('   ✅ Sports with detailed eligibility rules');
      console.log('   ✅ Users with comprehensive profiles');
      console.log('   ✅ Teams with player management');
      console.log('   ✅ Venues with detailed facilities');
      console.log('   ✅ Fixtures and match scheduling');
      console.log('   ✅ Live scoring and match management');
      console.log('   ✅ Media management system');
      console.log('   ✅ Notification templates');
      console.log('   ✅ Analytics and reporting');
      console.log('   ✅ Audit logging system');
      console.log('   ✅ System configuration');
      
      console.log('\n🎯 Key Features Implemented:');
      console.log('   • Panchayat-based eligibility verification');
      console.log('   • Age restrictions (max 3 under-21 players)');
      console.log('   • Multi-level tournament (cluster→division→final)');
      console.log('   • Comprehensive document management');
      console.log('   • Geographic restrictions and verification');
      console.log('   • Live scoring and match tracking');
      console.log('   • Complete audit trail');
      
      console.log('\n🚀 Ready for Gramotsavam 2025!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Comprehensive setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupComprehensiveDatabase };