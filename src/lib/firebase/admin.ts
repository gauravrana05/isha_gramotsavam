import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// This will hold our admin database instance
let adminDb: FirebaseFirestore.Firestore;
let adminAuth: ReturnType<typeof getAuth>;
function initializeFirebaseAdmin() {
  try {
    // Check if Firebase Admin is already initialized
    if (getApps().length > 0) {
      console.log('Firebase Admin already initialized');
      return getFirestore();
    }

    console.log('Initializing Firebase Admin...');
    
    // Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin environment variables');
    }

    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('Private Key length:', privateKey.length);

    // Create service account config
    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };

    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId,
    });

    console.log('Firebase Admin initialized successfully');
    return getFirestore(app);
    
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    throw new Error(`Firebase Admin setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize the admin database and auth
try {
  adminDb = initializeFirebaseAdmin();
  adminAuth = getAuth();
} catch (error) {
  console.error('Critical error initializing Firebase Admin:', error);
  throw error;
}

export { adminDb, adminAuth };