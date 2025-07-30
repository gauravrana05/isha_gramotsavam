
import * as admin from "firebase-admin";
import { HttpsError, onCall, CallableRequest } from "firebase-functions/v2/https";
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

/**
 * Creates a Firebase Authentication user for a player
 * Called by team captains when adding players to their teams
 */
export const createPlayerUser = onCall(async (request: CallableRequest) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      dob,
      gender,
      whatsappNumber,
      village,
      panchayat,
      taluk,
      district,
      state,
      teamId
    } = data;

    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !dob || !teamId) {
      throw new HttpsError("invalid-argument", "Missing required player information");
    }

    // Verify that the requesting user is the captain of the specified team
    const teamDoc = await admin.firestore().collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new HttpsError("not-found", "Team not found");
    }

    const teamData = teamDoc.data();
    if (teamData?.captainId !== auth.uid) {
      throw new HttpsError("permission-denied", "Only team captain can create players for this team");
    }

    // Check if user with this phone number already exists
    let existingUser;
    try {
      existingUser = await admin.auth().getUserByPhoneNumber(`+91${phoneNumber}`);
      
      // If user exists, just create their profile and return their UID
      const userProfileData = {
        uid: existingUser.uid,
        firstName,
        lastName,
        phoneNumber: phoneNumber,
        whatsappNumber: whatsappNumber || phoneNumber,
        dob,
        gender,
        village,
        panchayat: panchayat || teamData.panchayat,
        taluk: taluk || teamData.taluk,
        district: district || teamData.district,
        state: state || teamData.state,
        role: "player",
        isProfileComplete: true,
        isVerified: false,
        currentTeamId: teamId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        documents: {
          profilePhoto: {
            storagePath: `profilePhotos/${existingUser.uid}/profile_photo`,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          },
          aadhaarFront: {
            storagePath: `aadhaar/${existingUser.uid}/front_${Date.now()}`,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          },
          aadhaarBack: {
            storagePath: `aadhaar/${existingUser.uid}/back_${Date.now()}`,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          }
        }
      };

      await admin.firestore().collection("users").doc(existingUser.uid).set(userProfileData, { merge: true });

      return {
        success: true,
        userId: existingUser.uid,
        existed: true,
        message: "Existing user linked to team"
      };

    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error("Error checking existing user:", error);
        throw new HttpsError("internal", "Error checking existing user");
      }
    }

    // Create new Firebase Authentication user
    const userRecord = await admin.auth().createUser({
      phoneNumber: `+91${phoneNumber}`,
      displayName: `${firstName} ${lastName}`,
      disabled: false
    });

    // The user profile will be created automatically by the createUserProfile trigger
    // But we'll update it with player-specific information
    const userProfileData = {
      firstName,
      lastName,
      phoneNumber: phoneNumber,
      whatsappNumber: whatsappNumber || phoneNumber,
      dob,
      gender,
      village,
      panchayat: panchayat || teamData.panchayat,
      taluk: taluk || teamData.taluk,
      district: district || teamData.district,
      state: state || teamData.state,
      role: "player",
      isProfileComplete: true,
      currentTeamId: teamId,
      documents: {
        profilePhoto: {
          storagePath: `profilePhotos/${userRecord.uid}/profile_photo`,
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        },
        aadhaarFront: {
          storagePath: `aadhaar/${userRecord.uid}/front_${Date.now()}`,
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        },
        aadhaarBack: {
          storagePath: `aadhaar/${userRecord.uid}/back_${Date.now()}`,
          verified: false,
          uploadedAt: null,
          uploadedBy: null
        }
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update the user profile with player-specific data
    await admin.firestore().collection("users").doc(userRecord.uid).update(userProfileData);

    console.log(`Created Firebase user for player: ${userRecord.uid}`);

    return {
      success: true,
      userId: userRecord.uid,
      existed: false,
      message: "New user created and linked to team"
    };

  } catch (error) {
    console.error("Error creating player user:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError("internal", "Failed to create player user");
  }
});
