# Firebase Functions Deployment Guide

## Required Functions for Isha Gramotsavam

### Core Role Management Functions
These are **essential** for the public -> captain/player role transitions:

```bash
# Deploy role management functions
firebase deploy --only functions:assignEventRole
firebase deploy --only functions:promoteToTeamCaptain
firebase deploy --only functions:promoteToPlayer
firebase deploy --only functions:getCurrentEventRole
firebase deploy --only functions:onTeamCreated
firebase deploy --only functions:onPlayerAdded
firebase deploy --only functions:expireEventRoles
```

### Team Management Functions
Required for team creation and management:

```bash
# Deploy team functions
firebase deploy --only functions:createTeamWithCompleteSchema
firebase deploy --only functions:addPlayerToTeam
firebase deploy --only functions:submitTeamForVerificationEnhanced
```

### Verification Functions  
Required for team verification workflow:

```bash
# Deploy verification functions
firebase deploy --only functions:verifyTeam
firebase deploy --only functions:verifyPlayer
firebase deploy --only functions:approveTeam
firebase deploy --only functions:rejectTeam
```

### Storage Functions
Required for document processing:

```bash
# Deploy storage functions
firebase deploy --only functions:processAadhaarImageUpload
firebase deploy --only functions:processProfilePhotoUpload
firebase deploy --only functions:generateMediaThumbnail
```

### User Management Functions
Required for user profile management:

```bash
# Deploy user functions
firebase deploy --only functions:createUserProfile
firebase deploy --only functions:updateUserProfile
firebase deploy --only functions:getUserProfile
```

## Full Deployment Commands

### Deploy All Functions (Recommended)
```bash
firebase deploy --only functions
```

### Deploy Security Rules
```bash
firebase deploy --only firestore:rules,storage
```

### Deploy Everything
```bash
firebase deploy
```

## Critical Functions for Current Issue

To fix the "public -> captain/player" role transitions, you **must** deploy these functions:

```bash
firebase deploy --only functions:promoteToTeamCaptain,functions:promoteToPlayer,functions:assignEventRole,functions:onTeamCreated,functions:onPlayerAdded
```

## Environment Setup

### 1. Initialize Firebase Functions (if not done)
```bash
cd functions
npm install
cd ..
```

### 2. Set Firebase Project
```bash
firebase use isha-gramotsavam
```

### 3. Check Functions Configuration
```bash
firebase functions:config:get
```

## Function Dependencies

### Role Management Flow:
1. **User starts as 'public'** (default role)
2. **User creates team** → triggers `onTeamCreated`
3. **Auto-promotion** → calls `assignEventRole` with 'captain' role
4. **Role expiration** → `expireEventRoles` resets to 'public' after event

### Required Collections:
- `users/{userId}/eventRoles/{roleId}` - Event-based roles
- `teams/{teamId}` - Team documents
- `teams/{teamId}/players/{playerId}` - Team players
- `teams/{teamId}/verification/{verificationId}` - Verification records

## Function Triggers and Events

### Automatic Triggers:
- **onTeamCreated**: Firestore trigger when team document is created
- **Storage triggers**: When files are uploaded (Aadhaar, photos)
- **Role expiration**: Manual or scheduled trigger

### Manual Calls:
- **promoteToTeamCaptain**: Called after team creation
- **assignEventRole**: Role management
- **getCurrentEventRole**: Check user's current role

## Security Considerations

### Function Security:
- All functions validate authentication
- Role assignment requires proper permissions
- Team captain validation ensures ownership
- Event-based role isolation

### Firestore Rules Integration:
- Functions use admin SDK (bypasses security rules)
- Client calls are subject to security rules
- Role-based access control at document level

## Testing Functions

### Local Testing:
```bash
firebase emulators:start --only functions,firestore
```

### Function Logs:
```bash
firebase functions:log
```

### Specific Function Logs:
```bash
firebase functions:log --only promoteToTeamCaptain
```

## Common Issues and Solutions

### 1. Permission Denied on Team Creation
**Solution**: Deploy `assignEventRole` and `promoteToTeamCaptain`

### 2. Role Not Updating After Team Creation
**Solution**: Check `onTeamCreated` trigger deployment

### 3. Functions Not Found
**Solution**: Ensure functions are exported in `functions/index.ts`

### 4. Role Expiration Not Working
**Solution**: Deploy `expireEventRoles` and set up scheduled trigger

## Monitoring and Maintenance

### Function Health:
- Monitor function execution counts
- Check error rates in Firebase Console
- Set up alerts for function failures

### Role Cleanup:
- Schedule `expireEventRoles` to run after events
- Monitor active role counts
- Audit role assignments regularly

## Post-Deployment Verification

### 1. Test Role Flow:
```javascript
// Should work after deployment
1. User (public) creates team
2. Check user role → should be 'captain'
3. Team creation should succeed
4. User should have captain permissions
```

### 2. Check Function Logs:
```bash
firebase functions:log --limit 50
```

### 3. Verify Database:
- Check `users/{userId}/eventRoles` collection
- Verify team documents are created
- Confirm role assignments are active

## Emergency Rollback

If functions cause issues:

```bash
# Rollback functions
firebase functions:delete promoteToTeamCaptain
firebase functions:delete assignEventRole

# Redeploy previous version
git checkout [previous-commit]
firebase deploy --only functions
```