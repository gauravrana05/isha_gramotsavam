# Firebase Storage Functions Updates

## Overview
Updated the Firebase Cloud Functions for handling file uploads to match the actual storage path structure and user profile schema used in the Isha Gramotsavam application.

## Changes Made

### 1. Aadhaar Document Processing (`processAadhaarImageUpload`)

**Path Structure Update:**
- **Old:** `aadhaar/{userId}/(front|back)_.+..+$`
- **New:** `^Aadhar/{userId}/(front|back)_.+$`

**Field Name Updates:**
- **Old:** `aadharFrontUrl`, `aadharBackUrl`
- **New:** `aadhaarFrontURL`, `aadhaarBackURL`

**Key Features:**
- Processes uploads to `/Aadhar/{userId}/front_{timestamp}.{ext}` and `/Aadhar/{userId}/back_{timestamp}.{ext}`
- Updates user profile with document URLs
- Automatically sets `isProfileComplete: true` when both documents are uploaded
- Proper error handling and logging

### 2. Profile Photo Processing (`processProfilePhotoUpload`) - NEW

**Path Structure:**
- **Pattern:** `^Profilephotos/{userId}/profile_photo$`
- **Handles:** `/Profilephotos/{userId}/profile_photo`

**Features:**
- Processes profile photo uploads
- Updates `profilePhotoURL` field in user document
- Automatic signed URL generation
- Error handling and logging

### 3. Media Thumbnail Generation (`generateMediaThumbnail`)

**Path Structure Update:**
- **Old:** `^media/([a-zA-Z0-9_-]+)/([^/]+)$`
- **New:** `^Media/(\d{4})/([^/]+)/([^/]+)$`

**Shareable Link Update:**
- **Old:** Development URL with long random string
- **New:** `https://gramotsavam.isha.org.in/media/{year}/{eventId}/{fileName}`

**Key Features:**
- Processes uploads to `/Media/{year}/{eventId}/{fileName}`
- Generates thumbnails in `/Media/{year}/{eventId}/thumbnails/`
- Creates media documents with proper URLs
- Production-ready shareable links

## Storage Path Structure

### Document Types and Paths

| Document Type | Path Pattern | Access Level |
|--------------|-------------|--------------|
| Profile Photos | `/Profilephotos/{userId}/profile_photo` | User + Authenticated |
| Aadhaar Front | `/Aadhar/{userId}/front_{timestamp}.{ext}` | User + Verification + Admin |
| Aadhaar Back | `/Aadhar/{userId}/back_{timestamp}.{ext}` | User + Verification + Admin |
| Media Files | `/Media/{year}/{eventId}/{fileName}` | Public Read |
| Thumbnails | `/Media/{year}/{eventId}/thumbnails/{fileName}` | Public Read |

## User Profile Field Updates

### Before:
```javascript
{
  aadharFrontUrl: "...",
  aadharBackUrl: "...",
  profilePhotoUrl: "..."
}
```

### After:
```javascript
{
  aadhaarFrontURL: "...",
  aadhaarBackURL: "...",
  profilePhotoURL: "..."
}
```

## Integration with Document Upload Service

The storage functions now properly integrate with the `DocumentUploadService` class:

```typescript
// Document upload paths match storage function regex patterns
STORAGE_PATHS = {
  profilePhoto: (userId) => `Profilephotos/${userId}/profile_photo`,
  aadhaarFront: (userId) => `Aadhar/${userId}/front_${Date.now()}`,
  aadhaarBack: (userId) => `Aadhar/${userId}/back_${Date.now()}`
}
```

## Security Integration

The storage functions work with the updated Firebase Storage security rules:

- **Profile Photos**: User-writable, authenticated-readable
- **Aadhaar Documents**: User-writable, restricted read access
- **Media Files**: Authenticated-writable, public-readable

## Deployment

To deploy the updated storage functions:

```bash
firebase deploy --only functions:processAadhaarImageUpload,functions:processProfilePhotoUpload,functions:generateMediaThumbnail
```

## Testing

Ensure proper testing of:

1. **Aadhaar Upload Flow:**
   - Upload front document → Check URL in user profile
   - Upload back document → Check URL + `isProfileComplete` flag
   
2. **Profile Photo Upload:**
   - Upload photo → Check `profilePhotoURL` field

3. **Media Upload:**
   - Upload to media path → Check thumbnail generation
   - Verify shareable link format

## Error Handling

All functions include comprehensive error handling:
- Invalid file paths
- Non-image file types
- Firestore update failures
- Storage operation errors
- Proper cleanup of temporary files

## Logging

Enhanced logging for debugging:
- File path validation results
- User ID extraction
- URL generation success/failure
- Profile completion status changes
- Error details with context