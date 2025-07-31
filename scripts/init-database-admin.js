const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download the service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json'); // Download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'isha-gramotsavam'
});

const db = admin.firestore();

// Helper function to create phone numbers
const createPhoneNumber = (index) => `+91 ${8351000000 + index}`;

// Initial data
const initializeDatabase = async () => {
  console.log('Starting database initialization with Admin SDK...');

  try {
    // 1. Create Users (all roles)
    console.log('Creating users...');
    
    const users = [
      // Admin users (2)
      {
        uid: 'admin_001',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        phoneNumber: createPhoneNumber(0),
        whatsappNumber: createPhoneNumber(0),
        dob: '1985-06-15',
        gender: 'M',
        village: 'Coimbatore City',
        panchayat: 'Coimbatore Corporation',
        taluk: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        role: 'admin',
        isProfileComplete: true,
        isVerified: true,
        documents: {
          profilePhoto: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          },
          aadhaarFront: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          },
          aadhaarBack: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          }
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        uid: 'admin_002',
        firstName: 'Priya',
        lastName: 'Sharma',
        phoneNumber: createPhoneNumber(1),
        whatsappNumber: createPhoneNumber(1),
        dob: '1987-03-22',
        gender: 'F',
        village: 'Vijayawada',
        panchayat: 'Vijayawada Corporation',
        taluk: 'Vijayawada',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520010',
        role: 'admin',
        isProfileComplete: true,
        isVerified: true,
        documents: {
          profilePhoto: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          },
          aadhaarFront: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          },
          aadhaarBack: {
            storagePath: '',
            verified: true,
            uploadedAt: admin.firestore.Timestamp.now(),
            uploadedBy: 'system'
          }
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
      // Add other users following the same pattern...
    ];

    // Save users to Firestore using Admin SDK
    for (const user of users) {
      await db.collection('users').doc(user.uid).set(user);
      console.log(`Created user: ${user.firstName} ${user.lastName} (${user.role})`);
    }

    console.log('\n=== Database Initialization Complete ===');
    console.log('✅ Admin SDK initialization successful!');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Run the initialization
initializeDatabase();