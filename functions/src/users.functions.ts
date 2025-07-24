import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    const { uid, phoneNumber } = user;

    await admin.firestore().collection('users').doc(uid).set({
      userId: uid,
      phoneNumber: phoneNumber || null,
      role: 'public',
      assignedVenues: [],
      name: '',
      profilePhotoUrl: '',
      aadharFrontUrl: '',
      aadharBackUrl: '',
      village: '',
      panchayat: '',
      district: '',
      state: '',
      language: 'en',
      permissions: [],
      isProfileComplete: false,
      isVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`User profile created for user: ${uid}`);

  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});