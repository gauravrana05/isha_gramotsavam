/**
 * TypeScript version of Firebase initialization for better type safety
 * This script initializes the sports database with volleyball and throwball data
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { sportsConfig } from '../src/lib/config/sportsConfig';

// Types
interface Sport {
  sportId: string;
  name: string;
  description: string;
  category: 'men' | 'women' | 'mixed';
  status: 'active' | 'inactive' | 'upcoming';
  teamConfig: {
    minPlayers: number;
    maxPlayers: number;
    maxSubstitutes: number;
    totalSquadSize: number;
  };
  eligibility: {
    ageRange: { min: number; max: number };
    genderRestriction: 'men' | 'women' | 'mixed';
    skillLevel: string;
    requirements: string[];
  };
  eventInfo: {
    registrationStart: Date;
    registrationEnd: Date;
    eventStart: Date;
    eventEnd: Date;
    registrationFee: number;
    prizePool: {
      first: number;
      second: number;
      third: number;
    };
  };
  rules: {
    format: string;
    matchDuration: string;
    pointSystem: string;
    timeouts: string;
    substitutions: string;
  };
  assets: {
    primaryImage: string;
    gallery: string[];
    rulesDocument: string;
  };
  createdAt: Date;
  updatedAt: any;
}

// Initialize Firebase (you'll need to configure this with your actual config)
const firebaseConfig = {
  // Replace with your Firebase configuration
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sports data based on the existing sportsConfig
const sportsData: Sport[] = [
  {
    sportId: 'volleyball_men',
    name: 'Volleyball (Men)',
    description: 'Traditional 6-a-side volleyball for men with professional rules and regulations',
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
      requirements: [
        'Valid government ID proof (Aadhar/PAN/Driving License)',
        'Recent passport-size photograph',
        'Medical fitness certificate',
        'Team photograph with all players'
      ]
    },
    eventInfo: {
      registrationStart: new Date('2025-01-01T00:00:00Z'),
      registrationEnd: new Date('2025-02-15T23:59:59Z'),
      eventStart: new Date('2025-03-01T09:00:00Z'),
      eventEnd: new Date('2025-03-07T18:00:00Z'),
      registrationFee: 500,
      prizePool: {
        first: 50000,
        second: 30000,
        third: 20000
      }
    },
    rules: {
      format: '6 vs 6 players on court',
      matchDuration: 'Best of 5 sets (first to 25 points, final set to 15)',
      pointSystem: 'Rally point system',
      timeouts: '2 timeouts per team per set (30 seconds each)',
      substitutions: 'Unlimited substitutions with same player'
    },
    assets: {
      primaryImage: '/images/sports/volleyball-men.jpg',
      gallery: [
        '/images/sports/volleyball-action-1.jpg',
        '/images/sports/volleyball-action-2.jpg',
        '/images/sports/volleyball-court.jpg'
      ],
      rulesDocument: '/documents/volleyball-official-rules.pdf'
    },
    createdAt: new Date('2024-12-01T00:00:00Z'),
    updatedAt: serverTimestamp()
  },
  {
    sportId: 'volleyball_women',
    name: 'Volleyball (Women)',
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
      requirements: [
        'Valid government ID proof (Aadhar/PAN/Driving License)',
        'Recent passport-size photograph',
        'Medical fitness certificate',
        'Team photograph with all players'
      ]
    },
    eventInfo: {
      registrationStart: new Date('2025-01-01T00:00:00Z'),
      registrationEnd: new Date('2025-02-15T23:59:59Z'),
      eventStart: new Date('2025-03-02T09:00:00Z'),
      eventEnd: new Date('2025-03-06T18:00:00Z'),
      registrationFee: 500,
      prizePool: {
        first: 50000,
        second: 30000,
        third: 20000
      }
    },
    rules: {
      format: '6 vs 6 players on court',
      matchDuration: 'Best of 5 sets (first to 25 points, final set to 15)',
      pointSystem: 'Rally point system',
      timeouts: '2 timeouts per team per set (30 seconds each)',
      substitutions: 'Unlimited substitutions with same player'
    },
    assets: {
      primaryImage: '/images/sports/volleyball-women.jpg',
      gallery: [
        '/images/sports/volleyball-women-action-1.jpg',
        '/images/sports/volleyball-women-action-2.jpg',
        '/images/sports/volleyball-court.jpg'
      ],
      rulesDocument: '/documents/volleyball-official-rules.pdf'
    },
    createdAt: new Date('2024-12-01T00:00:00Z'),
    updatedAt: serverTimestamp()
  },
  {
    sportId: 'throwball_women',
    name: 'Throwball (Women)',
    description: 'Traditional throwball game for women - a popular rural sport with authentic Indian origins',
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
      requirements: [
        'Valid government ID proof (Aadhar/PAN/Driving License)',
        'Recent passport-size photograph',
        'Medical fitness certificate',
        'Team photograph with all players'
      ]
    },
    eventInfo: {
      registrationStart: new Date('2025-01-01T00:00:00Z'),
      registrationEnd: new Date('2025-02-15T23:59:59Z'),
      eventStart: new Date('2025-03-03T09:00:00Z'),
      eventEnd: new Date('2025-03-07T17:00:00Z'),
      registrationFee: 500,
      prizePool: {
        first: 50000,
        second: 30000,
        third: 20000
      }
    },
    rules: {
      format: '7 vs 7 players on court',
      matchDuration: 'Best of 3 sets (15 points each, final set to 15)',
      pointSystem: 'Traditional scoring system',
      timeouts: '1 timeout per team per set (30 seconds each)',
      substitutions: 'Maximum 3 substitutions per set'
    },
    assets: {
      primaryImage: '/images/sports/throwball.jpg',
      gallery: [
        '/images/sports/throwball-action-1.jpg',
        '/images/sports/throwball-action-2.jpg',
        '/images/sports/throwball-court.jpg'
      ],
      rulesDocument: '/documents/throwball-official-rules.pdf'
    },
    createdAt: new Date('2024-12-01T00:00:00Z'),
    updatedAt: serverTimestamp()
  }
];

export async function initializeSportsData() {
  console.log('🏐 Initializing Sports Data in Firebase...');
  
  try {
    let successCount = 0;
    
    for (const sport of sportsData) {
      try {
        await setDoc(doc(db, 'sports', sport.sportId), {
          ...sport,
          // Convert dates to Firestore Timestamps
          eventInfo: {
            ...sport.eventInfo,
            registrationStart: Timestamp.fromDate(sport.eventInfo.registrationStart),
            registrationEnd: Timestamp.fromDate(sport.eventInfo.registrationEnd),
            eventStart: Timestamp.fromDate(sport.eventInfo.eventStart),
            eventEnd: Timestamp.fromDate(sport.eventInfo.eventEnd),
          },
          createdAt: Timestamp.fromDate(sport.createdAt),
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Created sport: ${sport.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error creating sport ${sport.name}:`, error);
      }
    }
    
    console.log(`🎉 Successfully initialized ${successCount}/${sportsData.length} sports!`);
    
    // Also create the main event document
    await initializeMainEvent();
    
  } catch (error) {
    console.error('❌ Error initializing sports data:', error);
  }
}

async function initializeMainEvent() {
  console.log('📅 Initializing Main Event Data...');
  
  const mainEvent = {
    id: 'isha_gramotsavam_2025',
    name: 'Isha Gramotsavam 2025',
    description: 'Annual rural sports festival celebrating traditional games and fostering community spirit through sports',
    longDescription: `
      Isha Gramotsavam is a vibrant celebration of rural sports that brings together communities 
      to participate in traditional Indian games. This annual festival promotes physical fitness, 
      cultural values, and the spirit of healthy competition while preserving our sporting heritage.
      
      The event features professional-level competitions in Volleyball and Throwball, with separate 
      categories for men and women. All matches are conducted according to official rules with 
      certified referees and proper sports infrastructure.
    `,
    type: 'tournament',
    status: 'ongoing',
    startDate: Timestamp.fromDate(new Date('2025-03-01T06:00:00Z')),
    endDate: Timestamp.fromDate(new Date('2025-03-07T20:00:00Z')),
    registrationStartDate: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
    registrationEndDate: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
    venue: {
      primary: 'Isha Yoga Center Sports Complex',
      secondary: ['Community Center Indoor Courts', 'Government Sports Stadium']
    },
    maxParticipants: 1000,
    currentParticipants: 756,
    sports: ['volleyball_men', 'volleyball_women', 'throwball_women'],
    organizer: {
      name: 'Isha Foundation',
      contact: {
        email: 'sports@isha.org',
        phone: '+91 422 2515345',
        website: 'https://isha.sadhguru.org'
      }
    },
    rules: {
      general: [
        'All participants must be between 16-35 years of age',
        'Valid ID proof is mandatory for all players',
        'Medical fitness certificate required',
        'Team registration fee: ₹500 per team',
        'No refunds after verification process begins'
      ],
      conduct: [
        'Maintain discipline and sportsmanship at all times',
        'Follow referee decisions without argument',
        'Respect opponents and officials',
        'No use of performance-enhancing substances',
        'Arrive at venue 30 minutes before scheduled match time'
      ]
    },
    prizes: {
      volleyball_men: { first: 50000, second: 30000, third: 20000, participation: 5000 },
      volleyball_women: { first: 50000, second: 30000, third: 20000, participation: 5000 },
      throwball_women: { first: 50000, second: 30000, third: 20000, participation: 5000 }
    },
    schedule: {
      '2025-03-01': ['Opening Ceremony', 'Volleyball Men - Preliminary Rounds'],
      '2025-03-02': ['Volleyball Women - Preliminary Rounds'],
      '2025-03-03': ['Throwball Women - Preliminary Rounds'],
      '2025-03-04': ['Quarter Finals - All Sports'],
      '2025-03-05': ['Semi Finals - All Sports'],
      '2025-03-06': ['Finals - All Sports'],
      '2025-03-07': ['Prize Distribution', 'Closing Ceremony']
    },
    facilities: [
      'Free accommodation for outstation teams',
      'Meals provided during tournament days',
      'Free medical assistance',
      'Transportation from nearest bus/railway station',
      'Practice courts available day before matches'
    ],
    registrationProcess: [
      'Create account on Isha Gramotsavam portal',
      'Complete team captain profile',
      'Add team members with their details',
      'Upload required documents',
      'Pay registration fee online',
      'Wait for verification (2-3 working days)',
      'Receive confirmation and match schedule'
    ],
    createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'events', mainEvent.id), mainEvent);
    console.log('✅ Main event data initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing main event:', error);
  }
}

// Export for use in other scripts
export { sportsData };

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeSportsData()
    .then(() => {
      console.log('🎉 Sports data initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
}