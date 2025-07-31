import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const processAadhaarImageUpload = onObjectFinalized(async (event) => {
  const object = event.data;
  const filePath = object.name; // File path in the bucket
  const contentType = object.contentType; // File content type
  const bucket = object.bucket; // Get the bucket name

  // Exit if this is a deletion or a file that is not an image.
  if (!filePath || !contentType || !contentType.startsWith("image/")) {
    console.log("This is not an image.");
    return null;
  }

  // Extract userId and file type (front/back) from the file path
  const filePathRegex = /^aadhaar\/(.+)\/(front|back)_.+$/;
  const match = filePath.match(filePathRegex);

  if (!match || match.length !== 3) {
    console.log("Invalid Aadhaar image file path format.");
    return null;
  }

  const userId = match[1];
  const imageType = match[2]; // "front" or "back"

  if (!userId || (imageType !== "front" && imageType !== "back")) {
    console.log("Could not extract userId or image type from file path.");
    return null;
  }

  try {
    // Get the download URL for the uploaded image
    const file = getStorage().bucket(bucket).file(filePath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    // Update the user document in Firestore
    const userDocRef = admin.firestore().collection("users").doc(userId);

    // Update with structured document format
    const updateData: { [key: string]: any } = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (imageType === "front") {
      updateData[`documents.aadhaarFront.storagePath`] = filePath;
      updateData[`documents.aadhaarFront.url`] = url;
      updateData[`documents.aadhaarFront.verified`] = false;
      updateData[`documents.aadhaarFront.uploadedAt`] = admin.firestore.FieldValue.serverTimestamp();
      updateData[`documents.aadhaarFront.uploadedBy`] = userId;
    } else if (imageType === "back") {
      updateData[`documents.aadhaarBack.storagePath`] = filePath;
      updateData[`documents.aadhaarBack.url`] = url;
      updateData[`documents.aadhaarBack.verified`] = false;
      updateData[`documents.aadhaarBack.uploadedAt`] = admin.firestore.FieldValue.serverTimestamp();
      updateData[`documents.aadhaarBack.uploadedBy`] = userId;
    }

    await userDocRef.update(updateData);

    console.log(`aadhaar ${imageType} image URL added to user ${userId}: ${url}`);

    // Check if profile is now complete
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Check all required documents are present
      const hasAadhaarFront = userData?.documents?.aadhaarFront?.url;
      const hasAadhaarBack = userData?.documents?.aadhaarBack?.url;
      const hasProfilePhoto = userData?.documents?.profilePhoto?.url;
      
      // Check all required profile fields are present
      const hasRequiredFields = userData?.firstName && 
                               userData?.lastName && 
                               userData?.dob && 
                               userData?.gender && 
                               userData?.whatsappNumber &&
                               userData?.state &&
                               userData?.district &&
                               userData?.panchayat;
      
      if (
        hasAadhaarFront &&
        hasAadhaarBack &&
        hasProfilePhoto &&
        hasRequiredFields &&
        !userData?.isProfileComplete
      ) {
        await userDocRef.update({
          isProfileComplete: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`User ${userId} isProfileComplete set to true - all documents and profile fields complete.`);
      }
    }

    // Check for team verification updates
    await checkAndUpdateTeamVerification(userId);

    return null;
  } catch (error) {
    console.error("Error processing Aadhaar image upload:", error);
    return null;
  }
});

export const processProfilePhotoUpload = onObjectFinalized(
  {
    region: "us-central1", 
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name; // File path in the bucket
    const contentType = object.contentType;
    const bucket = object.bucket;

    if (!filePath || !contentType || !contentType.startsWith("image/")) {
      console.log("This is not an image.");
      return;
    }

    const filePathRegex = /^profilePhotos\/(.+)\/profile_photo$/;
    const match = filePath.match(filePathRegex);

    if (!match || match.length !== 2) {
      console.log("Invalid profile photo file path format.");
      return;
    }

    const userId = match[1];

    if (!userId) {
      console.log("Could not extract userId from file path.");
      return;
    }

    try {
      const file = getStorage().bucket(bucket).file(filePath);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      const userDocRef = admin.firestore().collection("users").doc(userId);
      
      // Update with structured document format
      const updateData = {
        [`documents.profilePhoto.storagePath`]: filePath,
        [`documents.profilePhoto.url`]: url,
        [`documents.profilePhoto.verified`]: false,
        [`documents.profilePhoto.uploadedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`documents.profilePhoto.uploadedBy`]: userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await userDocRef.update(updateData);
      
      // Check if profile is now complete
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Check all required documents are present
        const hasAadhaarFront = userData?.documents?.aadhaarFront?.url;
        const hasAadhaarBack = userData?.documents?.aadhaarBack?.url;
        const hasProfilePhoto = userData?.documents?.profilePhoto?.url;
        
        // Check all required profile fields are present
        const hasRequiredFields = userData?.firstName && 
                                 userData?.lastName && 
                                 userData?.dob && 
                                 userData?.gender && 
                                 userData?.whatsappNumber &&
                                 userData?.state &&
                                 userData?.district &&
                                 userData?.panchayat;
        
        if (
          hasAadhaarFront &&
          hasAadhaarBack &&
          hasProfilePhoto &&
          hasRequiredFields &&
          !userData?.isProfileComplete
        ) {
          await userDocRef.update({
            isProfileComplete: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`User ${userId} isProfileComplete set to true - all documents and profile fields complete.`);
        }
      }

      // Check for team verification updates
      await checkAndUpdateTeamVerification(userId);

      console.log(`Profile photo URL added to user ${userId}: ${url}`);
    } catch (error) {
      console.error("Error processing profile photo upload:", error);
    }
  }
);

export const generateMediaThumbnail = onObjectFinalized(async (event) => {
  const object = event.data;
  const filePath = object.name; // File path in the bucket
  const contentType = object.contentType; // File content type
  const bucket = object.bucket; // Get the bucket name
  const metageneration = object.metageneration; // Generation number

  // Exit if this is a metadata update or a deletion
  if (metageneration === 1 ||
     !filePath || !contentType ||
     !contentType.startsWith("image/")) {
    console.log("This is a metadata change, not a new file, or not an image.");
    return null;
  }

  // Extract path components from the media file path
  // Path format: Media/{year}/{eventId}/{fileName}
  const filePathRegex = /^Media\/(\d{4})\/([^/]+)\/([^/]+)$/;
  const match = filePath.match(filePathRegex);

  if (!match || match.length !== 4) {
    console.log("Invalid media file path format.");
    return null;
  }

  const year = match[1];
  const eventId = match[2];
  const fileName = match[3];
  const mediaId = `${year}_${eventId}_${fileName.split('.')[0]}`;
  const thumbnailFileName = `thumbnail_${fileName}`;
  const thumbnailFilePath = `Media/${year}/${eventId}/thumbnails/${thumbnailFileName}`;

  try {
    // Download the image to a temporary location
    const storageBucket = getStorage().bucket(bucket);

    // Thumbnail generation placeholder
    console.log(`Thumbnail generation skipped (requires image processing library)`);

    // Placeholder: Assuming thumbnail is generated and uploaded
    const thumbnailFile = storageBucket.file(thumbnailFilePath);

    // Get download URLs for original and thumbnail
    const [originalUrl] = await storageBucket.file(filePath).getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    const thumbnailGetUrlOptions = {
      action: "read" as const,
      expires: "03-01-2500",
    };
    const [thumbnailUrl] = await thumbnailFile.getSignedUrl(thumbnailGetUrlOptions);

    // Generate a shareable link  
    const shareableLink = `https://gramotsavam.isha.org.in/media/${year}/${eventId}/${fileName}`;

    // Update the media document in Firestore
    const mediaDocRef = admin.firestore().collection("media").doc(mediaId);

    await mediaDocRef.update({
      fileUrl: originalUrl,
      thumbnailUrl: thumbnailUrl,
      shareableLink: shareableLink,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Media document ${mediaId} updated with URLs and shareable link.`);

    return null;
  } catch (error) {
    console.error("Error processing media upload:", error);
    return null;
  }
});

// Helper function to check and update team verification status
async function checkAndUpdateTeamVerification(userId: string) {
  try {
    // Find teams where this user is a player or captain
    const teamsQuery = admin.firestore().collection("teams")
      .where("players", "array-contains-any", [
        {userId: userId}
      ]);
    
    const captainQuery = admin.firestore().collection("teams")
      .where("captainId", "==", userId);
    
    const [teamsSnapshot, captainSnapshot] = await Promise.all([
      teamsQuery.get(),
      captainQuery.get()
    ]);
    
    const allTeamDocs = [...teamsSnapshot.docs, ...captainSnapshot.docs];
    
    for (const teamDoc of allTeamDocs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      
      // Get all players including captain
      const allPlayers = teamData.players || [];
      
      // Add captain to players list for verification check
      if (teamData.captainId) {
        const captainDoc = await admin.firestore().collection("users").doc(teamData.captainId).get();
        if (captainDoc.exists) {
          const captainData = captainDoc.data();
          allPlayers.push({
            userId: teamData.captainId,
            verificationStatus: captainData?.verificationStatus || 'pending',
            documents: captainData?.documents || {}
          });
        }
      }
      
      // Check if all players are verified
      const allPlayersVerified = allPlayers.every((player: any) => {
        const docs = player.documents || {};
        return (
          player.verificationStatus === 'verified' &&
          docs.profilePhoto?.verified &&
          docs.aadhaarFront?.verified &&
          docs.aadhaarBack?.verified
        );
      });
      
      // Update team status if all players are verified
      if (allPlayersVerified && teamData.status !== 'verified') {
        await admin.firestore().collection("teams").doc(teamId).update({
          status: 'verified',
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`Team ${teamId} automatically verified - all players have complete documents`);
      }
    }
  } catch (error) {
    console.error(`Error checking team verification for user ${userId}:`, error);
  }
}