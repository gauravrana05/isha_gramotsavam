# Firebase Configuration for Replit Deployment

## 🔒 Firebase Security Rules Updates

### 1. Authentication Settings

**Add Replit Domains to Firebase Authentication:**

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add these domains:

```
your-repl-name.your-username.repl.co
your-repl-name--your-username.repl.co
*.replit.dev
*.repl.co
```

### 2. Firestore Security Rules

**Update `/firestore.rules`:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function isReelitDomain() {
      return request.host.matches('.*\\.replit\\.dev$') ||
             request.host.matches('.*\\.repl\\.co$') ||
             request.host.matches('localhost:[0-9]+$');
    }
    
    // Users collection - user can read/write their own data
    match /users/{userId} {
      allow read, write: if isOwner(userId) && isReelitDomain();
      allow read: if hasRole('admin') || hasRole('verification') && isReelitDomain();
    }
    
    // Teams collection
    match /teams/{teamId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if (hasRole('captain') || hasRole('admin')) && isReelitDomain();
      allow update: if hasRole('verification') && isReelitDomain();
    }
    
    // Venues collection
    match /venues/{venueId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if hasRole('admin') && isReelitDomain();
    }
    
    // Matches collection
    match /matches/{matchId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if (hasRole('volunteer') || hasRole('admin')) && isReelitDomain();
    }
    
    // Fixtures collection
    match /fixtures/{fixtureId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if hasRole('admin') && isReelitDomain();
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if hasRole('admin') && isReelitDomain();
    }
    
    // Media collection
    match /media/{mediaId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow create: if isAuthenticated() && isReelitDomain();
      allow update, delete: if isOwner(resource.data.uploadedBy) || hasRole('admin') && isReelitDomain();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId) && isReelitDomain();
      allow create: if hasRole('admin') || hasRole('volunteer') && isReelitDomain();
    }
    
    // Audit logs (admin only)
    match /auditLogs/{logId} {
      allow read, write: if hasRole('admin') && isReelitDomain();
    }
    
    // System config (admin only)
    match /systemConfig/{configId} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if hasRole('admin') && isReelitDomain();
    }
  }
}
```

### 3. Storage Security Rules

**Update `/storage.rules`:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function isReelitDomain() {
      return request.host.matches('.*\\.replit\\.dev$') ||
             request.host.matches('.*\\.repl\\.co$') ||
             request.host.matches('localhost:[0-9]+$');
    }
    
    function isValidImageFile() {
      return resource.contentType.matches('image/.*');
    }
    
    function isValidDocumentFile() {
      return resource.contentType.matches('image/.*') ||
             resource.contentType.matches('application/pdf');
    }
    
    function isValidSize() {
      return resource.size < 10 * 1024 * 1024; // 10MB limit
    }
    
    // Profile photos - users can upload their own
    match /profile-photos/{userId}/{allPaths=**} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if isOwner(userId) && isValidImageFile() && isValidSize() && isReelitDomain();
    }
    
    // Document uploads - users can upload their own documents
    match /documents/{userId}/{allPaths=**} {
      allow read: if (isOwner(userId) || hasRole('verification') || hasRole('admin')) && isReelitDomain();
      allow write: if isOwner(userId) && isValidDocumentFile() && isValidSize() && isReelitDomain();
    }
    
    // Team photos - team captains can upload
    match /team-photos/{teamId}/{allPaths=**} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if (hasRole('captain') || hasRole('admin')) && isValidImageFile() && isValidSize() && isReelitDomain();
    }
    
    // Match media - volunteers can upload
    match /match-media/{matchId}/{allPaths=**} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if (hasRole('volunteer') || hasRole('admin')) && isValidImageFile() && isValidSize() && isReelitDomain();
    }
    
    // Event media - admins can upload
    match /event-media/{eventId}/{allPaths=**} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if hasRole('admin') && isValidImageFile() && isValidSize() && isReelitDomain();
    }
    
    // General media - authenticated users can upload
    match /media/{allPaths=**} {
      allow read: if isAuthenticated() && isReelitDomain();
      allow write: if isAuthenticated() && isValidImageFile() && isValidSize() && isReelitDomain();
    }
  }
}
```

## 🚀 Deployment Commands

### Deploy Security Rules to Firebase

1. **Install Firebase CLI (if not already installed):**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login --no-localhost
```

3. **Initialize Firebase in your project (if not already done):**
```bash
firebase init
```

4. **Deploy only security rules:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

5. **Deploy everything:**
```bash
firebase deploy
```

## 🔧 Environment Variables for Replit

**Add these to Replit Secrets:**

```env
# Firebase Web SDK Configuration (Public - safe for client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDCSeY8hL1GsD86RGwU3kgIU4THEF9yMy0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=isha-gramotsavam.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=isha-gramotsavam
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=isha-gramotsavam.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=221477987127
NEXT_PUBLIC_FIREBASE_APP_ID=1:221477987127:web:c4f1b64015ca56f9c730b2
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-655V5N8FZV

# Firebase Admin SDK Configuration (Private - server-side only)
FIREBASE_PROJECT_ID=isha-gramotsavam
FIREBASE_CLIENT_EMAIL=your-service-account@isha-gramotsavam.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CLIENT_ID=your-client-id
```

## ⚠️ Important Security Notes

1. **Domain Validation:** The security rules include domain validation to ensure requests come from authorized sources (localhost, replit.dev, repl.co)

2. **Role-based Access:** All database operations require proper user roles and authentication

3. **File Upload Restrictions:** 
   - 10MB file size limit
   - Image files only for most uploads
   - PDF allowed for document uploads

4. **Firestore Rules:** Comprehensive rules covering all collections with proper role-based access control

5. **Storage Rules:** Organized by upload type with appropriate permissions

## 🧪 Testing Security Rules

**Test your security rules using Firebase Emulator:**

```bash
# Start the emulator
firebase emulators:start --only firestore,storage

# Run your app against local emulator
# Update your Firebase config to point to emulator for testing
```

**In your Firebase config (for testing only):**

```typescript
// Add this for local testing with emulator
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## ✅ Verification Steps

After deploying rules:

1. **Test Authentication:** Ensure login/logout works
2. **Test Role-based Access:** Each role should only access permitted resources
3. **Test File Uploads:** Verify size and type restrictions work
4. **Test Real-time Updates:** Ensure Firestore listeners work
5. **Test Domain Restrictions:** Access should work from Replit domain only

---

**Next Steps:** Refer to `DEPLOYMENT_VERIFICATION.md` for complete testing checklist.