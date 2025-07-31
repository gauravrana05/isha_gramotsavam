const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCSeY8hL1GsD86RGwU3kgIU4THEF9yMy0",
  authDomain: "isha-gramotsavam.firebaseapp.com",
  projectId: "isha-gramotsavam",
  storageBucket: "isha-gramotsavam.firebasestorage.app",
  messagingSenderId: "221477987127",
  appId: "1:221477987127:web:c4f1b64015ca56f9c730b2",
  measurementId: "G-655V5N8FZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to create phone numbers
const createPhoneNumber = (index) => `+91 ${8351000000 + index}`;

// Initial data
const initializeDatabase = async () => {
  console.log('Starting database initialization...');

  try {
    // 1. Create Users (all roles)
    // console.log('Creating users...');
    
    // const users = [
    //   // Admin users (2)
    //   {
    //     uid: 'admin_001',
    //     firstName: 'Rajesh',
    //     lastName: 'Kumar',
    //     phoneNumber: createPhoneNumber(0),
    //     whatsappNumber: createPhoneNumber(0),
    //     dob: '1985-06-15',
    //     gender: 'M',
    //     village: 'Coimbatore City',
    //     panchayat: 'Coimbatore Corporation',
    //     taluk: 'Coimbatore',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     pincode: '641001',
    //     role: 'admin',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: '',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       },
    //       aadhaarFront: {
    //         storagePath: '',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       },
    //       aadhaarBack: {
    //         storagePath: '',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'admin_002',
    //     firstName: 'Priya',
    //     lastName: 'Sharma',
    //     phoneNumber: createPhoneNumber(1),
    //     whatsappNumber: createPhoneNumber(1),
    //     dob: '1987-03-22',
    //     gender: 'F',
    //     village: 'Vijayawada',
    //     panchayat: 'Vijayawada Corporation',
    //     taluk: 'Vijayawada',
    //     district: 'Krishna',
    //     state: 'Andhra Pradesh',
    //     pincode: '520010',
    //     role: 'admin',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/admin_002/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/admin_002/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/admin_002/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'system'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Captains (4)
    //   {
    //     uid: 'captain_001',
    //     firstName: 'Murugan',
    //     lastName: 'Selvam',
    //     phoneNumber: createPhoneNumber(2),
    //     whatsappNumber: createPhoneNumber(2),
    //     dob: '1992-08-15',
    //     gender: 'M',
    //     village: 'Kondampatti',
    //     panchayat: 'Kondampatti Panchayat',
    //     taluk: 'Sulur',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'captain',
    //     currentTeamId: 'team_001',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/captain_001/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/captain_001/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/captain_001/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'captain_002',
    //     firstName: 'Lakshmi',
    //     lastName: 'Devi',
    //     phoneNumber: createPhoneNumber(3),
    //     whatsappNumber: createPhoneNumber(3),
    //     dob: '1990-12-10',
    //     gender: 'F',
    //     village: 'Perur',
    //     panchayat: 'Perur Panchayat',
    //     taluk: 'Coimbatore',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'captain',
    //     currentTeamId: 'team_002',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/captain_002/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/captain_002/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/captain_002/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'captain_003',
    //     firstName: 'Ravi',
    //     lastName: 'Kumar',
    //     phoneNumber: createPhoneNumber(4),
    //     whatsappNumber: createPhoneNumber(4),
    //     dob: '1988-05-20',
    //     gender: 'M',
    //     village: 'Guntur',
    //     panchayat: 'Guntur Corporation',
    //     taluk: 'Guntur',
    //     district: 'Guntur',
    //     state: 'Andhra Pradesh',
    //     role: 'captain',
    //     currentTeamId: 'team_003',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/captain_003/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/captain_003/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/captain_003/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'captain_004',
    //     firstName: 'Sita',
    //     lastName: 'Patel',
    //     phoneNumber: createPhoneNumber(5),
    //     whatsappNumber: createPhoneNumber(5),
    //     dob: '1991-09-18',
    //     gender: 'F',
    //     village: 'Bhubaneswar',
    //     panchayat: 'Bhubaneswar Corporation',
    //     taluk: 'Bhubaneswar',
    //     district: 'Khurda',
    //     state: 'Odisha',
    //     role: 'captain',
    //     currentTeamId: 'team_004',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/captain_004/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/captain_004/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/captain_004/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Players (8)
    //   {
    //     uid: 'player_001',
    //     firstName: 'Senthil',
    //     lastName: 'Kumar',
    //     phoneNumber: createPhoneNumber(6),
    //     whatsappNumber: createPhoneNumber(6),
    //     dob: '1995-04-12',
    //     gender: 'M',
    //     village: 'Kondampatti',
    //     panchayat: 'Kondampatti Panchayat',
    //     taluk: 'Sulur',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'player',
    //     currentTeamId: 'team_001',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_001/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_001/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_001/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_002',
    //     firstName: 'Karthik',
    //     lastName: 'Raj',
    //     phoneNumber: createPhoneNumber(7),
    //     whatsappNumber: createPhoneNumber(7),
    //     dob: '1996-11-25',
    //     gender: 'M',
    //     village: 'Kondampatti',
    //     panchayat: 'Kondampatti Panchayat',
    //     taluk: 'Sulur',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'player',
    //     currentTeamId: 'team_001',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_002/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_002/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_002/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_003',
    //     firstName: 'Meera',
    //     lastName: 'Nair',
    //     phoneNumber: createPhoneNumber(8),
    //     whatsappNumber: createPhoneNumber(8),
    //     dob: '1993-07-08',
    //     gender: 'F',
    //     village: 'Perur',
    //     panchayat: 'Perur Panchayat',
    //     taluk: 'Coimbatore',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'player',
    //     currentTeamId: 'team_002',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_003/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_003/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_003/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_004',
    //     firstName: 'Kavitha',
    //     lastName: 'S',
    //     phoneNumber: createPhoneNumber(9),
    //     whatsappNumber: createPhoneNumber(9),
    //     dob: '1994-02-14',
    //     gender: 'F',
    //     village: 'Perur',
    //     panchayat: 'Perur Panchayat',
    //     taluk: 'Coimbatore',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'player',
    //     currentTeamId: 'team_002',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_004/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_004/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_004/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_005',
    //     firstName: 'Suresh',
    //     lastName: 'Reddy',
    //     phoneNumber: createPhoneNumber(10),
    //     whatsappNumber: createPhoneNumber(10),
    //     dob: '1997-01-30',
    //     gender: 'M',
    //     village: 'Guntur',
    //     panchayat: 'Guntur Corporation',
    //     taluk: 'Guntur',
    //     district: 'Guntur',
    //     state: 'Andhra Pradesh',
    //     role: 'player',
    //     currentTeamId: 'team_003',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_005/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_005/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_005/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_006',
    //     firstName: 'Manoj',
    //     lastName: 'Kumar',
    //     phoneNumber: createPhoneNumber(11),
    //     whatsappNumber: createPhoneNumber(11),
    //     dob: '1998-06-22',
    //     gender: 'M',
    //     village: 'Guntur',
    //     panchayat: 'Guntur Corporation',
    //     taluk: 'Guntur',
    //     district: 'Guntur',
    //     state: 'Andhra Pradesh',
    //     role: 'player',
    //     currentTeamId: 'team_003',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_006/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_006/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_006/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_007',
    //     firstName: 'Asha',
    //     lastName: 'Patnaik',
    //     phoneNumber: createPhoneNumber(12),
    //     whatsappNumber: createPhoneNumber(12),
    //     dob: '1992-10-05',
    //     gender: 'F',
    //     village: 'Bhubaneswar',
    //     panchayat: 'Bhubaneswar Corporation',
    //     taluk: 'Bhubaneswar',
    //     district: 'Khurda',
    //     state: 'Odisha',
    //     role: 'player',
    //     currentTeamId: 'team_004',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_007/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_007/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_007/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'player_008',
    //     firstName: 'Sunita',
    //     lastName: 'Das',
    //     phoneNumber: createPhoneNumber(13),
    //     whatsappNumber: createPhoneNumber(13),
    //     dob: '1996-03-18',
    //     gender: 'F',
    //     village: 'Bhubaneswar',
    //     panchayat: 'Bhubaneswar Corporation',
    //     taluk: 'Bhubaneswar',
    //     district: 'Khurda',
    //     state: 'Odisha',
    //     role: 'player',
    //     currentTeamId: 'team_004',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/player_008/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/player_008/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/player_008/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Volunteers General (3)
    //   {
    //     uid: 'volunteer_general_001',
    //     firstName: 'Arjun',
    //     lastName: 'Singh',
    //     phoneNumber: createPhoneNumber(14),
    //     whatsappNumber: createPhoneNumber(14),
    //     dob: '1989-11-12',
    //     gender: 'M',
    //     village: 'Pollachi',
    //     panchayat: 'Pollachi Municipality',
    //     taluk: 'Pollachi',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     role: 'volunteer_general',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_general_001/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_general_001/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_general_001/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'volunteer_general_002',
    //     firstName: 'Deepa',
    //     lastName: 'Menon',
    //     phoneNumber: createPhoneNumber(15),
    //     whatsappNumber: createPhoneNumber(15),
    //     dob: '1991-08-25',
    //     gender: 'F',
    //     village: 'Tirupati',
    //     panchayat: 'Tirupati Corporation',
    //     taluk: 'Tirupati',
    //     district: 'Chittoor',
    //     state: 'Andhra Pradesh',
    //     role: 'volunteer_general',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_general_002/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_general_002/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_general_002/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'volunteer_general_003',
    //     firstName: 'Ramesh',
    //     lastName: 'Sahoo',
    //     phoneNumber: createPhoneNumber(16),
    //     whatsappNumber: createPhoneNumber(16),
    //     dob: '1986-12-03',
    //     gender: 'M',
    //     village: 'Cuttack',
    //     panchayat: 'Cuttack Corporation',
    //     taluk: 'Cuttack',
    //     district: 'Cuttack',
    //     state: 'Odisha',
    //     role: 'volunteer_general',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_general_003/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_general_003/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_general_003/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Volunteers Technical (3)
    //   {
    //     uid: 'volunteer_technical_001',
    //     firstName: 'Vikram',
    //     lastName: 'Iyer',
    //     phoneNumber: createPhoneNumber(17),
    //     whatsappNumber: createPhoneNumber(17),
    //     dob: '1990-04-16',
    //     gender: 'M',
    //     village: 'Udumalpet',
    //     panchayat: 'Udumalpet Municipality',
    //     taluk: 'Udumalpet',
    //     district: 'Tirupur',
    //     state: 'Tamil Nadu',
    //     role: 'volunteer_technical',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_technical_001/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_technical_001/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_technical_001/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'volunteer_technical_002',
    //     firstName: 'Anitha',
    //     lastName: 'Rao',
    //     phoneNumber: createPhoneNumber(18),
    //     whatsappNumber: createPhoneNumber(18),
    //     dob: '1988-09-11',
    //     gender: 'F',
    //     village: 'Kurnool',
    //     panchayat: 'Kurnool Corporation',
    //     taluk: 'Kurnool',
    //     district: 'Kurnool',
    //     state: 'Andhra Pradesh',
    //     role: 'volunteer_technical',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_technical_002/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_technical_002/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_technical_002/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_002'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     uid: 'volunteer_technical_003',
    //     firstName: 'Santosh',
    //     lastName: 'Mohanty',
    //     phoneNumber: createPhoneNumber(19),
    //     whatsappNumber: createPhoneNumber(19),
    //     dob: '1985-07-28',
    //     gender: 'M',
    //     village: 'Puri',
    //     panchayat: 'Puri Municipality',
    //     taluk: 'Puri',
    //     district: 'Puri',
    //     state: 'Odisha',
    //     role: 'volunteer_technical',
    //     isProfileComplete: true,
    //     isVerified: true,
    //     documents: {
    //       profilePhoto: {
    //         storagePath: 'users/volunteer_technical_003/profile.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarFront: {
    //         storagePath: 'users/volunteer_technical_003/aadhaar_front.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       },
    //       aadhaarBack: {
    //         storagePath: 'users/volunteer_technical_003/aadhaar_back.jpg',
    //         verified: true,
    //         uploadedAt: Timestamp.now(),
    //         uploadedBy: 'admin_001'
    //       }
    //     },
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   }
    // ];

    // // Save users to Firestore
    // for (const user of users) {
    //   await setDoc(doc(db, 'users', user.uid), user);
    //   console.log(`Created user: ${user.firstName} ${user.lastName} (${user.role})`);
    // }

    // // 2. Create Sports
    // console.log('Creating sports...');
    
    // const sports = [
    //   {
    //     sportId: 'volleyball_men',
    //     name: 'Volleyball',
    //     displayName: 'Volleyball (Men)',
    //     description: 'Professional 6-a-side volleyball for men with traditional rules',
        
    //     category: 'team',
    //     genderCategories: ['men'],
        
    //     minPlayers: 6,
    //     maxPlayers: 6,
    //     minSubstitutes: 0,
    //     maxSubstitutes: 6,
        
    //     minAge: 16,
    //     maxAge: 35,
    //     maxPlayersUnder21: 3,
    //     allowPET: false,
        
    //     restrictedToStates: [], // Available in all states
        
    //     scoringSystem: {
    //       pointsToWin: 25,
    //       setsToWin: 3, // Best of 5 sets
    //       timeLimit: 90, // 90 minutes maximum
    //       customRules: [
    //         'Deuce rule: Must win by 2 points',
    //         'Final set plays to 15 points',
    //         'Maximum 2 timeouts per team per set',
    //         'Unlimited substitutions with same player'
    //       ]
    //     },
        
    //     iconURL: 'https://storage.googleapis.com/isha-gramotsavam/icons/volleyball.png',
    //     bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/volleyball-men.jpg',
    //     rulesPDF: 'https://storage.googleapis.com/isha-gramotsavam/rules/volleyball-rules.pdf',
        
    //     isActive: true,
    //     availableInEvents: ['isha_gramotsavam_2025'],
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     sportId: 'throwball_women',
    //     name: 'Throwball',
    //     displayName: 'Throwball (Women)',
    //     description: 'Traditional 7-a-side throwball for women - authentic rural sport',
        
    //     category: 'team',
    //     genderCategories: ['women'],
        
    //     minPlayers: 7,
    //     maxPlayers: 7,
    //     minSubstitutes: 0,
    //     maxSubstitutes: 5,
        
    //     minAge: 16,
    //     maxAge: 35,
    //     maxPlayersUnder21: 3,
    //     allowPET: false,
        
    //     restrictedToStates: [], // Available in all states
        
    //     scoringSystem: {
    //       pointsToWin: 15,
    //       setsToWin: 2, // Best of 3 sets
    //       timeLimit: 60, // 60 minutes maximum
    //       customRules: [
    //         'Must win by 2 points',
    //         'Maximum 1 timeout per team per set',
    //         'Maximum 3 substitutions per set',
    //         'No serving from the net line'
    //       ]
    //     },
        
    //     iconURL: 'https://storage.googleapis.com/isha-gramotsavam/icons/throwball.png',
    //     bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/throwball-women.jpg',
    //     rulesPDF: 'https://storage.googleapis.com/isha-gramotsavam/rules/throwball-rules.pdf',
        
    //     isActive: true,
    //     availableInEvents: ['isha_gramotsavam_2025'],
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   }
    // ];

    // // Save sports to Firestore
    // for (const sport of sports) {
    //   await setDoc(doc(db, 'sports', sport.sportId), sport);
    //   console.log(`Created sport: ${sport.displayName}`);
    // }

    // // 3. Create Event
    // console.log('Creating event...');
    
    // const event = {
    //   eventId: 'isha_gramotsavam_2025',
    //   name: 'Isha Gramotsavam 2025',
    //   description: 'Annual rural sports festival celebrating traditional games and community spirit',
    //   year: 2025,
      
    //   registrationStartDate: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
    //   registrationEndDate: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
    //   eventStartDate: Timestamp.fromDate(new Date('2025-03-01T06:00:00Z')),
    //   eventEndDate: Timestamp.fromDate(new Date('2025-03-15T20:00:00Z')),
      
    //   tournamentLevels: ['cluster', 'division', 'final'],
    //   maxTeamsPerCluster: 30,
    //   advancementRules: {
    //     clusterToDiv: 2, // Top 2 teams advance
    //     divToFinal: 2
    //   },
      
    //   activeSports: [
    //     {
    //       sportId: 'volleyball_men',
    //       sportName: 'Volleyball (Men)',
    //       isActive: true,
    //       genderCategories: ['men'],
    //       maxTeamsPerCategory: 64,
    //       registrationDeadline: Timestamp.fromDate(new Date('2025-02-10T23:59:59Z'))
    //     },
    //     {
    //       sportId: 'throwball_women',
    //       sportName: 'Throwball (Women)',
    //       isActive: true,
    //       genderCategories: ['women'],
    //       maxTeamsPerCategory: 32,
    //       registrationDeadline: Timestamp.fromDate(new Date('2025-02-10T23:59:59Z'))
    //     }
    //   ],
      
    //   prizes: [
    //     {
    //       level: 'final',
    //       position: 'winner',
    //       prizeAmount: 50000,
    //       prizeDescription: 'Championship Trophy + Cash Prize'
    //     },
    //     {
    //       level: 'final',
    //       position: 'runner_up',
    //       prizeAmount: 25000,
    //       prizeDescription: 'Runner-up Trophy + Cash Prize'
    //     },
    //     {
    //       level: 'final',
    //       position: 'third',
    //       prizeAmount: 15000,
    //       prizeDescription: 'Third Place Trophy + Cash Prize'
    //     },
    //     {
    //       level: 'division',
    //       position: 'winner',
    //       prizeAmount: 10000,
    //       prizeDescription: 'Division Winner Trophy + Cash Prize'
    //     },
    //     {
    //       level: 'cluster',
    //       position: 'winner',
    //       prizeAmount: 5000,
    //       prizeDescription: 'Cluster Winner Trophy + Cash Prize'
    //     }
    //   ],
      
    //   venues: [
    //     // Will be populated after venues are created
    //     'venue_isha_final_001',
    //     'venue_tn_coimbatore_cluster_001', 'venue_tn_tirupur_cluster_001', 
    //     'venue_tn_salem_cluster_001', 'venue_tn_erode_cluster_001',
    //     'venue_ap_krishna_cluster_001', 'venue_ap_guntur_cluster_001',
    //     'venue_ap_chittoor_cluster_001', 'venue_ap_kurnool_cluster_001',
    //     'venue_od_khurda_cluster_001', 'venue_od_cuttack_cluster_001', 'venue_od_puri_cluster_001',
    //     'venue_tn_div1_001', 'venue_tn_div2_001',
    //     'venue_ap_div1_001', 'venue_od_div1_001'
    //   ],
    //   providesFood: true,
    //   providesAccommodation: true,
    //   travelAllowanceFromLevel: 'division',
      
    //   requiresAadhaar: true,
    //   teamCompositionRules: {
    //     samePanchayat: true,
    //     excludeMunicipalities: false, // Allow municipalities for wider participation
    //     allowPlayerChangesAfterCluster: false
    //   },
      
    //   bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/2025-main.jpg',
    //   livestreamURL: 'https://youtube.com/live/isha-gramotsavam-2025',
    //   youtubeChannelId: 'UCIshaGramotsavam',
    //   socialMediaHandles: {
    //     facebook: 'IshaGramotsavam',
    //     instagram: '@isha_gramotsavam',
    //     twitter: '@IshaGramotsavam'
    //   },
      
    //   status: 'registration_open',
    //   isPublic: true,
    //   isFeatured: true,
      
    //   supportPhone: '+91 422 2515345',
    //   supportEmail: 'support@gramotsavam.isha.org',
      
    //   totalRegistrations: 4,
    //   totalTeamsVerified: 4,
    //   totalMatches: 0,
      
    //   createdAt: Timestamp.now(),
    //   updatedAt: Timestamp.now()
    // };

    // await setDoc(doc(db, 'events', event.eventId), event);
    // console.log(`Created event: ${event.name}`);

    // // 4. Create Venues
    // console.log('Creating venues...');
    
    // const venues = [
    //   // Finals venue - Isha Yoga Center
    //   {
    //     venueId: 'venue_isha_final_001',
    //     name: 'Isha Yoga Center - Main Arena',
    //     shortName: 'IYC Main',
    //     type: 'final',
        
    //     address: 'Isha Yoga Center, Velliangiri Foothills, Coimbatore',
    //     pincode: '641114',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 11.0168,
    //       longitude: 76.9558
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Professional synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 2,
    //         courtSpecifications: 'Professional synthetic surface, 12.2m x 18.3m, LED lighting, electronic scoreboard'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Rajesh Kumar',
    //       phone: '+91 9876543210',
    //       email: 'rajesh.kumar@isha.org',
    //       role: 'Venue Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_001', 'volunteer_technical_001'],
    //     officials: {
    //       coordinatorId: 'admin_001',
    //       referees: ['volunteer_technical_001', 'volunteer_technical_002'],
    //       medicalOfficer: 'volunteer_general_001'
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 8, // Finals matches
    //     utilizationRate: 85.5,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Tamil Nadu Cluster Venues (4)
    //   {
    //     venueId: 'venue_tn_coimbatore_cluster_001',
    //     name: 'Coimbatore District Sports Complex',
    //     shortName: 'CDSC',
    //     type: 'cluster',
        
    //     address: 'Race Course Road, Coimbatore',
    //     pincode: '641018',
    //     district: 'Coimbatore',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 11.0041,
    //       longitude: 76.9669
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting, manual scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Murugan Selvam',
    //       phone: createPhoneNumber(2),
    //       role: 'District Sports Officer'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_001'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_001',
    //       referees: ['volunteer_technical_001'],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 12,
    //     utilizationRate: 65.2,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_tn_tirupur_cluster_001',
    //     name: 'Tirupur Municipal Stadium',
    //     shortName: 'TMS',
    //     type: 'cluster',
        
    //     address: 'Kumaran Nagar, Tirupur',
    //     pincode: '641604',
    //     district: 'Tirupur',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 11.1085,
    //       longitude: 77.3411
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Kannan Raja',
    //       phone: '+91 9876543211',
    //       role: 'Stadium Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_technical_001'],
    //     officials: {
    //       coordinatorId: 'volunteer_technical_001',
    //       referees: ['volunteer_general_001'],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 8,
    //     utilizationRate: 45.8,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_tn_salem_cluster_001',
    //     name: 'Salem Sports Arena',
    //     shortName: 'SSA',
    //     type: 'cluster',
        
    //     address: 'Fairlands, Salem',
    //     pincode: '636016',
    //     district: 'Salem',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 11.6643,
    //       longitude: 78.1460
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Selvam Kumar',
    //       phone: '+91 9876543212',
    //       role: 'Arena Coordinator'
    //     },
        
    //     assignedVolunteers: [],
    //     officials: {
    //       coordinatorId: null,
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 6,
    //     utilizationRate: 35.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_tn_erode_cluster_001',
    //     name: 'Erode District Ground',
    //     shortName: 'EDG',
    //     type: 'cluster',
        
    //     address: 'Collectorate Complex, Erode',
    //     pincode: '638001',
    //     district: 'Erode',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 11.3410,
    //       longitude: 77.7172
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Ravi Chandran',
    //       phone: '+91 9876543213',
    //       role: 'Ground Keeper'
    //     },
        
    //     assignedVolunteers: [],
    //     officials: {
    //       coordinatorId: null,
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 4,
    //     utilizationRate: 25.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Andhra Pradesh Cluster Venues (4)
    //   {
    //     venueId: 'venue_ap_krishna_cluster_001',
    //     name: 'Krishna District Sports Complex',
    //     shortName: 'KDSC',
    //     type: 'cluster',
        
    //     address: 'Patamata, Vijayawada',
    //     pincode: '520010',
    //     district: 'Krishna',
    //     state: 'Andhra Pradesh',
    //     coordinates: {
    //       latitude: 16.5062,
    //       longitude: 80.6480
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Venkat Rao',
    //       phone: '+91 9876543214',
    //       role: 'Sports Complex Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_002'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_002',
    //       referees: ['volunteer_technical_002'],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 10,
    //     utilizationRate: 55.5,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_ap_guntur_cluster_001',
    //     name: 'Guntur Municipal Stadium',
    //     shortName: 'GMS',
    //     type: 'cluster',
        
    //     address: 'Brodipet, Guntur',
    //     pincode: '522002',
    //     district: 'Guntur',
    //     state: 'Andhra Pradesh',
    //     coordinates: {
    //       latitude: 16.3067,
    //       longitude: 80.4365
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Ravi Kumar',
    //       phone: createPhoneNumber(4),
    //       role: 'Stadium Coordinator'
    //     },
        
    //     assignedVolunteers: [],
    //     officials: {
    //       coordinatorId: null,
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 6,
    //     utilizationRate: 40.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_ap_chittoor_cluster_001',
    //     name: 'Chittoor Sports Ground',
    //     shortName: 'CSG',
    //     type: 'cluster',
        
    //     address: 'Tirupati Road, Chittoor',
    //     pincode: '517001',
    //     district: 'Chittoor',
    //     state: 'Andhra Pradesh',
    //     coordinates: {
    //       latitude: 13.2172,
    //       longitude: 79.1003
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Deepa Menon',
    //       phone: createPhoneNumber(15),
    //       role: 'Ground Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_002'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_002',
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 4,
    //     utilizationRate: 30.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_ap_kurnool_cluster_001',
    //     name: 'Kurnool District Arena',
    //     shortName: 'KDA',
    //     type: 'cluster',
        
    //     address: 'Station Road, Kurnool',
    //     pincode: '518001',
    //     district: 'Kurnool',
    //     state: 'Andhra Pradesh',
    //     coordinates: {
    //       latitude: 15.8281,
    //       longitude: 78.0373
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Anitha Rao',
    //       phone: createPhoneNumber(18),
    //       role: 'Arena Supervisor'
    //     },
        
    //     assignedVolunteers: ['volunteer_technical_002'],
    //     officials: {
    //       coordinatorId: 'volunteer_technical_002',
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 4,
    //     utilizationRate: 25.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Odisha Cluster Venues (3)
    //   {
    //     venueId: 'venue_od_khurda_cluster_001',
    //     name: 'Khurda Sports Complex',
    //     shortName: 'KSC',
    //     type: 'cluster',
        
    //     address: 'Unit-8, Bhubaneswar',
    //     pincode: '751012',
    //     district: 'Khurda',
    //     state: 'Odisha',
    //     coordinates: {
    //       latitude: 20.2961,
    //       longitude: 85.8245
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Ramesh Sahoo',
    //       phone: createPhoneNumber(16),
    //       role: 'Complex Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_003'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_003',
    //       referees: ['volunteer_technical_003'],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 6,
    //     utilizationRate: 50.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_od_cuttack_cluster_001',
    //     name: 'Cuttack District Stadium',
    //     shortName: 'CDS',
    //     type: 'cluster',
        
    //     address: 'Buxi Bazar, Cuttack',
    //     pincode: '753001',
    //     district: 'Cuttack',
    //     state: 'Odisha',
    //     coordinates: {
    //       latitude: 20.4625,
    //       longitude: 85.8828
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Santosh Mohanty',
    //       phone: createPhoneNumber(19),
    //       role: 'Stadium Officer'
    //     },
        
    //     assignedVolunteers: ['volunteer_technical_003'],
    //     officials: {
    //       coordinatorId: 'volunteer_technical_003',
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 4,
    //     utilizationRate: 35.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_od_puri_cluster_001',
    //     name: 'Puri Municipal Ground',
    //     shortName: 'PMG',
    //     type: 'cluster',
        
    //     address: 'Grand Road, Puri',
    //     pincode: '752001',
    //     district: 'Puri',
    //     state: 'Odisha',
    //     coordinates: {
    //       latitude: 19.8135,
    //       longitude: 85.8312
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Jagannath Das',
    //       phone: '+91 9876543220',
    //       role: 'Ground Supervisor'
    //     },
        
    //     assignedVolunteers: [],
    //     officials: {
    //       coordinatorId: null,
    //       referees: [],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 2,
    //     utilizationRate: 20.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },

    //   // Division Venues (4 total: 2 TN, 1 AP, 1 Odisha)
    //   {
    //     venueId: 'venue_tn_div1_001',
    //     name: 'Chennai Sports Hub - Division 1',
    //     shortName: 'CSH-D1',
    //     type: 'division',
        
    //     address: 'Nungambakkam, Chennai',
    //     pincode: '600034',
    //     district: 'Chennai',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 13.0827,
    //       longitude: 80.2707
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 3,
    //         courtSpecifications: 'Professional synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 2,
    //         courtSpecifications: 'Professional synthetic surface, 12.2m x 18.3m, LED lighting, electronic scoreboard'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Arvind Swami',
    //       phone: '+91 9876543221',
    //       email: 'arvind.swami@chennaisports.org',
    //       role: 'Division Coordinator'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_001', 'volunteer_technical_001'],
    //     officials: {
    //       coordinatorId: 'admin_001',
    //       referees: ['volunteer_technical_001', 'volunteer_technical_002'],
    //       medicalOfficer: 'volunteer_general_001'
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 16,
    //     utilizationRate: 75.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_tn_div2_001',
    //     name: 'Madurai Division Arena',
    //     shortName: 'MDA',
    //     type: 'division',
        
    //     address: 'Avaniyapuram, Madurai',
    //     pincode: '625012',
    //     district: 'Madurai',
    //     state: 'Tamil Nadu',
    //     coordinates: {
    //       latitude: 9.9252,
    //       longitude: 78.1198
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Synthetic surface, 18m x 9m, LED lighting, manual scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 2,
    //         courtSpecifications: 'Synthetic surface, 12.2m x 18.3m, LED lighting, manual scoreboard'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Meenakshi Sundaram',
    //       phone: '+91 9876543222',
    //       email: 'meenakshi@maduraiarena.org',
    //       role: 'Arena Manager'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_001'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_001',
    //       referees: ['volunteer_technical_001'],
    //       medicalOfficer: null
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 12,
    //     utilizationRate: 60.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_ap_div1_001',
    //     name: 'Visakhapatnam Division Center',
    //     shortName: 'VDC',
    //     type: 'division',
        
    //     address: 'MVP Colony, Visakhapatnam',
    //     pincode: '530017',
    //     district: 'Visakhapatnam',
    //     state: 'Andhra Pradesh',
    //     coordinates: {
    //       latitude: 17.7231,
    //       longitude: 83.3012
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 2,
    //         courtSpecifications: 'Synthetic surface, 12.2m x 18.3m, LED lighting, electronic scoreboard'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Lakshmi Narayana',
    //       phone: '+91 9876543223',
    //       email: 'lakshmi@vizagdivision.org',
    //       role: 'Division Head'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_002', 'volunteer_technical_002'],
    //     officials: {
    //       coordinatorId: 'admin_002',
    //       referees: ['volunteer_technical_002'],
    //       medicalOfficer: 'volunteer_general_002'
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 10,
    //     utilizationRate: 65.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   },
    //   {
    //     venueId: 'venue_od_div1_001',
    //     name: 'Bhubaneswar Division Stadium',
    //     shortName: 'BDS',
    //     type: 'division',
        
    //     address: 'Kalinga Stadium Road, Bhubaneswar',
    //     pincode: '751014',
    //     district: 'Khurda',
    //     state: 'Odisha',
    //     coordinates: {
    //       latitude: 20.2799,
    //       longitude: 85.8420
    //     },
        
    //     supportedSports: [
    //       {
    //         sportId: 'volleyball_men',
    //         sportName: 'Volleyball (Men)',
    //         courtCount: 2,
    //         courtSpecifications: 'Synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    //       },
    //       {
    //         sportId: 'throwball_women',
    //         sportName: 'Throwball (Women)',
    //         courtCount: 1,
    //         courtSpecifications: 'Synthetic surface, 12.2m x 18.3m, LED lighting, electronic scoreboard'
    //       }
    //     ],
        
    //     primaryContact: {
    //       name: 'Subhash Chandra',
    //       phone: '+91 9876543224',
    //       email: 'subhash@bbsrdivision.org',
    //       role: 'Stadium Director'
    //     },
        
    //     assignedVolunteers: ['volunteer_general_003', 'volunteer_technical_003'],
    //     officials: {
    //       coordinatorId: 'volunteer_general_003',
    //       referees: ['volunteer_technical_003'],
    //       medicalOfficer: 'volunteer_general_003'
    //     },
        
    //     isActive: true,
    //     currentStatus: 'available',
    //     totalMatchesHosted: 0,
    //     upcomingMatches: 8,
    //     utilizationRate: 55.0,
        
    //     createdAt: Timestamp.now(),
    //     updatedAt: Timestamp.now()
    //   }
    // ];

    // // Save venues to Firestore
    // for (const venue of venues) {
    //   await setDoc(doc(db, 'venues', venue.venueId), venue);
    //   console.log(`Created venue: ${venue.name} (${venue.type})`);
    // }

    // 5. Create Teams
    console.log('Creating teams...');
    
    const teams = [
      // Team 1 - Volleyball Men (Tamil Nadu)
      {
        teamId: 'team_001',
        name: 'Kondampatti Warriors',
        description: 'A dedicated volleyball team from Kondampatti village representing rural sports excellence',
        
        eventId: 'isha_gramotsavam_2025',
        sportId: 'volleyball_men',
        sportName: 'Volleyball (Men)',
        genderCategory: 'men',
        
        panchayat: 'Kondampatti Panchayat',
        taluk: 'Sulur',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        
        maxPlayers: 6,
        maxSubstitutes: 6,
        currentPlayers: 2,
        currentSubstitutes: 0,
        
        captainId: 'captain_001',
        captainProfile: {
          name: 'Murugan Selvam',
          phone: createPhoneNumber(2),
          panchayat: 'Kondampatti Panchayat',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          documents: {
            profilePhoto: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            }
          }
        },
        
        players: [
          {
            playerId: 'player_captain_001',
            userId: 'captain_001',
            teamId: 'team_001',
            name: 'Murugan Selvam',
            phone: createPhoneNumber(2),
            dob: '1992-08-15',
            age: 32,
            gender: 'M',
            position: 'main',
            
            profileData: {
              firstName: 'Murugan',
              lastName: 'Selvam',
              whatsappNumber: createPhoneNumber(2),
              village: 'Kondampatti',
              panchayat: 'Kondampatti Panchayat',
              taluk: 'Sulur',
              district: 'Coimbatore',
              state: 'Tamil Nadu',
              pincode: '641109'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Captain eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'self'
          },
          {
            playerId: 'player_001_team_001',
            userId: 'player_001',
            teamId: 'team_001',
            name: 'Senthil Kumar',
            phone: createPhoneNumber(6),
            dob: '1995-04-12',
            age: 29,
            gender: 'M',
            position: 'main',
            
            profileData: {
              firstName: 'Senthil',
              lastName: 'Kumar',
              whatsappNumber: createPhoneNumber(6),
              village: 'Kondampatti',
              panchayat: 'Kondampatti Panchayat',
              taluk: 'Sulur',
              district: 'Coimbatore',
              state: 'Tamil Nadu',
              pincode: '641109'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Age eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'captain_001'
          }
        ],
        
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin_001',
        
        createdAt: Timestamp.now(),
        updatedAt: new Date().toISOString()
      },

      // Team 2 - Throwball Women (Tamil Nadu)
      {
        teamId: 'team_002',
        name: 'Perur Queens',
        description: 'Traditional throwball team from Perur representing women in rural sports',
        
        eventId: 'isha_gramotsavam_2025',
        sportId: 'throwball_women',
        sportName: 'Throwball (Women)',
        genderCategory: 'women',
        
        panchayat: 'Perur Panchayat',
        taluk: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        
        maxPlayers: 7,
        maxSubstitutes: 5,
        currentPlayers: 2,
        currentSubstitutes: 0,
        
        captainId: 'captain_002',
        captainProfile: {
          name: 'Lakshmi Devi',
          phone: createPhoneNumber(3),
          panchayat: 'Perur Panchayat',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          documents: {
            profilePhoto: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            }
          }
        },
        
        players: [
          {
            playerId: 'player_captain_002',
            userId: 'captain_002',
            teamId: 'team_002',
            name: 'Lakshmi Devi',
            phone: createPhoneNumber(3),
            dob: '1990-12-10',
            age: 34,
            gender: 'F',
            position: 'main',
            
            profileData: {
              firstName: 'Lakshmi',
              lastName: 'Devi',
              whatsappNumber: createPhoneNumber(3),
              village: 'Perur',
              panchayat: 'Perur Panchayat',
              taluk: 'Coimbatore',
              district: 'Coimbatore',
              state: 'Tamil Nadu',
              pincode: '641010'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Captain eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'self'
          },
          {
            playerId: 'player_003_team_002',
            userId: 'player_003',
            teamId: 'team_002',
            name: 'Meera Nair',
            phone: createPhoneNumber(8),
            dob: '1993-07-08',
            age: 31,
            gender: 'F',
            position: 'main',
            
            profileData: {
              firstName: 'Meera',
              lastName: 'Nair',
              whatsappNumber: createPhoneNumber(8),
              village: 'Perur',
              panchayat: 'Perur Panchayat',
              taluk: 'Coimbatore',
              district: 'Coimbatore',
              state: 'Tamil Nadu',
              pincode: '641010'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Age eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'captain_002'
          }
        ],
        
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin_001',
        
        createdAt: Timestamp.now(),
        updatedAt: new Date().toISOString()
      },

      // Team 3 - Volleyball Men (Andhra Pradesh)
      {
        teamId: 'team_003',
        name: 'Guntur Gladiators',
        description: 'Strong volleyball team from Guntur district representing Andhra Pradesh',
        
        eventId: 'isha_gramotsavam_2025',
        sportId: 'volleyball_men',
        sportName: 'Volleyball (Men)',
        genderCategory: 'men',
        
        panchayat: 'Guntur Corporation',
        taluk: 'Guntur',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        
        maxPlayers: 6,
        maxSubstitutes: 6,
        currentPlayers: 2,
        currentSubstitutes: 0,
        
        captainId: 'captain_003',
        captainProfile: {
          name: 'Ravi Kumar',
          phone: createPhoneNumber(4),
          panchayat: 'Guntur Corporation',
          district: 'Guntur',
          state: 'Andhra Pradesh',
          documents: {
            profilePhoto: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_002'
            },
            aadhaarFront: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_002'
            },
            aadhaarBack: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_002'
            }
          }
        },
        
        players: [
          {
            playerId: 'player_captain_003',
            userId: 'captain_003',
            teamId: 'team_003',
            name: 'Ravi Kumar',
            phone: createPhoneNumber(4),
            dob: '1988-05-20',
            age: 36,
            gender: 'M',
            position: 'main',
            
            profileData: {
              firstName: 'Ravi',
              lastName: 'Kumar',
              whatsappNumber: createPhoneNumber(4),
              village: 'Guntur',
              panchayat: 'Guntur Corporation',
              taluk: 'Guntur',
              district: 'Guntur',
              state: 'Andhra Pradesh',
              pincode: '522002'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Captain eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'self'
          },
          {
            playerId: 'player_005_team_003',
            userId: 'player_005',
            teamId: 'team_003',
            name: 'Suresh Reddy',
            phone: createPhoneNumber(10),
            dob: '1997-01-30',
            age: 27,
            gender: 'M',
            position: 'main',
            
            profileData: {
              firstName: 'Suresh',
              lastName: 'Reddy',
              whatsappNumber: createPhoneNumber(10),
              village: 'Guntur',
              panchayat: 'Guntur Corporation',
              taluk: 'Guntur',
              district: 'Guntur',
              state: 'Andhra Pradesh',
              pincode: '522002'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_002'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Age eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'captain_003'
          }
        ],
        
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin_002',
        
        createdAt: Timestamp.now(),
        updatedAt: new Date().toISOString()
      },

      // Team 4 - Throwball Women (Odisha)
      {
        teamId: 'team_004',
        name: 'Bhubaneswar Belles',
        description: 'Elite throwball team from Bhubaneswar representing Odisha state',
        
        eventId: 'isha_gramotsavam_2025',
        sportId: 'throwball_women',
        sportName: 'Throwball (Women)',
        genderCategory: 'women',
        
        panchayat: 'Bhubaneswar Corporation',
        taluk: 'Bhubaneswar',
        district: 'Khurda',
        state: 'Odisha',
        
        maxPlayers: 7,
        maxSubstitutes: 5,
        currentPlayers: 2,
        currentSubstitutes: 0,
        
        captainId: 'captain_004',
        captainProfile: {
          name: 'Sita Patel',
          phone: createPhoneNumber(5),
          panchayat: 'Bhubaneswar Corporation',
          district: 'Khurda',
          state: 'Odisha',
          documents: {
            profilePhoto: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              url: null,
              verified: true,
              uploadedAt: Timestamp.now(),
              uploadedBy: 'admin_001'
            }
          }
        },
        
        players: [
          {
            playerId: 'player_captain_004',
            userId: 'captain_004',
            teamId: 'team_004',
            name: 'Sita Patel',
            phone: createPhoneNumber(5),
            dob: '1991-09-18',
            age: 33,
            gender: 'F',
            position: 'main',
            
            profileData: {
              firstName: 'Sita',
              lastName: 'Patel',
              whatsappNumber: createPhoneNumber(5),
              village: 'Bhubaneswar',
              panchayat: 'Bhubaneswar Corporation',
              taluk: 'Bhubaneswar',
              district: 'Khurda',
              state: 'Odisha',
              pincode: '751012'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Captain eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'self'
          },
          {
            playerId: 'player_007_team_004',
            userId: 'player_007',
            teamId: 'team_004',
            name: 'Asha Patnaik',
            phone: createPhoneNumber(12),
            dob: '1992-10-05',
            age: 32,
            gender: 'F',
            position: 'main',
            
            profileData: {
              firstName: 'Asha',
              lastName: 'Patnaik',
              whatsappNumber: createPhoneNumber(12),
              village: 'Bhubaneswar',
              panchayat: 'Bhubaneswar Corporation',
              taluk: 'Bhubaneswar',
              district: 'Khurda',
              state: 'Odisha',
              pincode: '751012'
            },
            
            documents: {
              profilePhoto: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarFront: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              },
              aadhaarBack: {
                storagePath: '',
                url: null,
                verified: true,
                uploadedAt: Timestamp.now(),
                uploadedBy: 'admin_001'
              }
            },
            
            profileComplete: true,
            verificationStatus: 'approved',
            verificationComments: ['All documents verified', 'Age eligibility confirmed'],
            
            addedAt: new Date().toISOString(),
            addedBy: 'captain_004'
          }
        ],
        
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin_001',
        
        createdAt: Timestamp.now(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Save teams to Firestore
    for (const team of teams) {
      await setDoc(doc(db, 'teams', team.teamId), team);
      console.log(`Created team: ${team.name} (${team.sportName})`);
    }

    console.log('\n=== Database Initialization Complete ===');
    console.log('✅ Users created: 20 (2 admin, 4 captain, 8 player, 3 volunteer_general, 3 volunteer_technical)');
    console.log('✅ Sports created: 2 (Volleyball Men, Throwball Women)');
    console.log('✅ Events created: 1 (Isha Gramotsavam 2025)');
    console.log('✅ Venues created: 16');
    console.log('   - 1 Final venue (Isha Yoga Center)');
    console.log('   - 11 Cluster venues (4 TN, 4 AP, 3 Odisha)');
    console.log('   - 4 Division venues (2 TN, 1 AP, 1 Odisha)');
    console.log('✅ Teams created: 4 (2 Volleyball Men, 2 Throwball Women)');
    console.log('\nPhone numbers used: 8351000000 - 8351000019');
    console.log('All users are verified and ready for the tournament!');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Run the initialization
initializeDatabase();