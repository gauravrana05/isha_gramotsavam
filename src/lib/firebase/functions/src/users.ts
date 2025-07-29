
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity";

// Initialize the Admin SDK if it hasn't been already
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Creates a user profile document in Firestore right before a new user account
 * is created in Firebase Authentication.
 */
export const createUserProfile = beforeUserCreated(async (event) => {
  try {
    const uid = event.data?.uid;
    const phoneNumber = event.data?.phoneNumber;
    const email = event.data?.email;
    const displayName = event.data?.displayName;

    if (!uid) {
      console.error("No UID found in event data for user creation.");
      // This error will prevent the user from being created.
      throw new HttpsError("invalid-argument", "No UID found in event data, cannot create user.");
    }

    // Default profile data for a new user
    const userProfileData = {
      userId: uid,
      phoneNumber: phoneNumber || null,
      email: email || null,
      name: displayName || "",
      role: "public", // Default role
      isProfileComplete: false,
      isVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add other default fields from your snippet
      assignedVenues: [],
      permissions: [],
      profilePhotoURL: null,
      aadhaarFrontURL: null,
      aadhaarBackURL: null,
      pincode: "",
      village: "",
      panchayat: "",
      taluk: "",
      district: "",
      state: "",
      countryOfResidence: "India",
      gender: "",
      dob: "",
      nationality: "",
      preferredLanguage: "en",
      whatsappNumber: "",
      whatsappCountryCode: "91",
      company: "",
      profession: "",
      passport: "",
      pan: "",
    };

    // Set the data in Firestore
    await admin.firestore().collection("users").doc(uid).set(userProfileData);

    console.log(`Successfully created Firestore profile for new user: ${uid}`);
    
    // Return an empty object to allow user creation to proceed
    return {};

  } catch (error: unknown) {
    console.error("FATAL: Error creating user profile:", error);
    
    // To prevent the user account from being created in a broken state,
    // re-throw the error.
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "An unexpected error occurred while creating the user profile.", error);
    }
  }
});
