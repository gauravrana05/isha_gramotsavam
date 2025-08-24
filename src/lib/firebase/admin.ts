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
      // Console log removed
      return getFirestore();
    }

    // Console log removed
    
    // Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin environment variables');
    }

    // Console log removed
    // Console log removed
    // Console log removed

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

    // Console log removed
    return getFirestore(app);
    
  } catch (error) {
    // Error handling removed
    throw new Error(`Firebase Admin setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize the admin database and auth
try {
  adminDb = initializeFirebaseAdmin();
  adminAuth = getAuth();
} catch (error) {
  // Error handling removed
  throw error;
}

export { adminDb, adminAuth };