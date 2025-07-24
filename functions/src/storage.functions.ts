import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
// const sharp = require('sharp'); // Remember to install

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const processAadhaarImageUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // File path in the bucket
  const contentType = object.contentType; // File content type
  const bucket = object.bucket; // Get the bucket name

  // Exit if this is a deletion or a file that is not an image.
  if (!filePath || !contentType || !contentType.startsWith('image/')) {
    console.log('This is not an image.');
    return null;
  }

  // Extract userId and file type (front/back) from the file path
  const filePathRegex = /aadhaar/(.+)/(front|back)_.+..+$/;
  const match = filePath.match(filePathRegex);

  if (!match || match.length !== 3) {
    console.log('Invalid Aadhaar image file path format.');
    return null;
  }

  const userId = match[1];
  const imageType = match[2]; // 'front' or 'back'

  if (!userId || (imageType !== 'front' && imageType !== 'back')) {
      console.log('Could not extract userId or image type from file path.');
      return null;
  }

  try {
    // Get the download URL for the uploaded image
    const file = getStorage().bucket(bucket).file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Set a far future expiry date for effectively public access (consider security implications)
    });

    // Update the user document in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userId);

    const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (imageType === 'front') {
      updateData.aadharFrontUrl = url;
    } else if (imageType === 'back') {
      updateData.aadharBackUrl = url;
    }

    await userDocRef.update(updateData);

    console.log(`Aadhaar ${imageType} image URL added to user ${userId}: ${url}`);

    // Optional: Check if both front and back images are now available and update isProfileComplete
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.aadharFrontUrl && userData?.aadharBackUrl && !userData?.isProfileComplete) {
             await userDocRef.update({
                 isProfileComplete: true,
                 updatedAt: admin.firestore.FieldValue.serverTimestamp(),
             });
             console.log(`User ${userId} isProfileComplete set to true.`);
        }
    }


    return null; // Cloud Functions should return null or a Promise
  } catch (error) {
    console.error('Error processing Aadhaar image upload:', error);
    return null; // Indicate failure
  }
});

export const generateMediaThumbnail = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // File path in the bucket
  const contentType = object.contentType; // File content type
  const bucket = object.bucket; // Get the bucket name
  const metageneration = object.metageneration; // Generation number

  // Exit if this is a metadata update or a deletion.
  if (metageneration === '1' || !filePath || !contentType || !contentType.startsWith('image/')) {
    console.log('This is a metadata change, not a new file, or not an image.');
    return null;
  }

  // Extract mediaId from the file path
  const filePathRegex = /media/(.+)/.+$/;
  const match = filePath.match(filePathRegex);

  if (!match || match.length !== 2) {
    console.log('Invalid media file path format.');
    return null;
  }

  const mediaId = match[1];
  const fileName = path.basename(filePath);
  const thumbnailFileName = `thumbnail_${fileName}`;
  const thumbnailFilePath = `thumbnails/${mediaId}/${thumbnailFileName}`;
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const tempThumbnailPath = path.join(os.tmpdir(), thumbnailFileName);

  try {
    // Download the image to a temporary location
    const storageBucket = getStorage().bucket(bucket);
    await storageBucket.file(filePath).download({ destination: tempFilePath });
    console.log('Image downloaded locally to', tempFilePath);

    // Generate a thumbnail (Requires Sharp library or similar)
    // Example using Sharp:
    // await sharp(tempFilePath).resize(200, 200).toFile(tempThumbnailPath);
    // console.log('Thumbnail generated to', tempThumbnailPath);

    // For now, let's skip actual thumbnail generation and just proceed with URLs
    console.log('Thumbnail generation skipped (requires image processing library)');
    // In a real implementation, you would upload the tempThumbnailPath to Cloud Storage

    // Placeholder: Assuming thumbnail is generated and uploaded, get its URL
    // Replace with actual thumbnail upload and URL retrieval
    const thumbnailFile = storageBucket.file(thumbnailFilePath);
     // Upload the generated thumbnail
    // await storageBucket.upload(tempThumbnailPath, { destination: thumbnailFilePath });
    // console.log('Thumbnail uploaded to Cloud Storage:', thumbnailFilePath);


    // Get download URLs for original and thumbnail (using signed URLs for now)
     const [originalUrl] = await storageBucket.file(filePath).getSignedUrl({
       action: 'read',
       expires: '03-01-2500',
     });
     // Placeholder for thumbnail URL - replace with actual URL retrieval after upload
     const thumbnailGetUrlOptions = {
        action: 'read' as 'read', // Explicitly cast to the literal type
        expires: '03-01-2500',
      };
     const [thumbnailUrl] = await thumbnailFile.getSignedUrl(thumbnailGetUrlOptions);


    // Generate a simple shareable link (could be a dedicated page in your frontend)
    const shareableLink = `https://your-app-domain/media/${mediaId}`; // Replace with your app domain

    // Update the media document in Firestore
    const mediaDocRef = admin.firestore().collection('media').doc(mediaId);

    await mediaDocRef.update({
      fileUrl: originalUrl,
      thumbnailUrl: thumbnailUrl, // Update with the actual thumbnail URL
      shareableLink: shareableLink,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Media document ${mediaId} updated with URLs and shareable link.`);

    // Clean up temporary files
    fs.unlinkSync(tempFilePath);
    // fs.unlinkSync(tempThumbnailPath); // Uncomment when actual thumbnail is generated

    return null;
  } catch (error) {
    console.error('Error processing media upload:', error);
    // Clean up temporary files in case of error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    // if (fs.existsSync(tempThumbnailPath)) { // Uncomment when actual thumbnail is generated
    //   fs.unlinkSync(tempThumbnailPath);
    // }
    return null;
  }
});