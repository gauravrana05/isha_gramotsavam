# Firebase Functions Deployment Guide

## Project Structure
This is the **correct and recommended** approach for Firebase Functions. Your functions are organized in `/src/lib/firebase/functions/` which follows Firebase best practices.

## Quick Deployment

### 1. Navigate to Functions Directory
```bash
cd src/lib/firebase/functions
```

### 2. Install Dependencies (if not done)
```bash
npm install
```

### 3. Build Functions
```bash
npm run build
```

### 4. Deploy All Functions
```bash
npm run deploy
# OR
firebase deploy --only functions
```

## Selective Deployment

### Critical Functions for Role Management
```bash
firebase deploy --only functions:assignEventRole,functions:promoteToPlayer,functions:promoteToTeamCaptain,functions:onPlayerAdded,functions:onTeamCreated
```

### Team Management Functions
```bash
firebase deploy --only functions:createTeamWithCompleteSchema,functions:addPlayerToTeam,functions:submitTeamForVerificationEnhanced
```

### Storage Functions
```bash
firebase deploy --only functions:processAadhaarImageUpload,functions:processProfilePhotoUpload,functions:generateMediaThumbnail
```

### Verification Functions
```bash
firebase deploy --only functions:verifyTeam,functions:verifyPlayer,functions:getTeamsPendingVerification,functions:getTeamForVerification
```

### User Management Functions (CRITICAL - Deploy First!)
```bash
firebase deploy --only functions:createUserProfile,functions:createPlayerUser
```

## Function Categories

### 🔑 Role Management (`roles.ts`)
- `assignEventRole` - Assign roles to users for events
- `promoteToPlayer` - Promote users to player role
- `promoteToTeamCaptain` - Promote users to captain role  
- `getCurrentEventRole` - Get user's current role
- `expireEventRoles` - Auto-expire roles after events
- `onPlayerAdded` - **Trigger**: Auto-promote when player added
- `onTeamCreated` - **Trigger**: Auto-promote when team created

### 🏆 Team Management (`teams.ts`)
- `createTeamWithCompleteSchema` - Create teams with full schema
- `addPlayerToTeam` - Add players to teams
- `submitTeamForVerificationEnhanced` - Submit teams for verification

### 📁 Storage (`storage.ts`)
- `processAadhaarImageUpload` - **Trigger**: Process Aadhaar uploads
- `processProfilePhotoUpload` - **Trigger**: Process profile photos
- `generateMediaThumbnail` - **Trigger**: Generate media thumbnails

### ✅ Verification (`verification.ts`)
- `verifyTeam` - Verify/approve teams
- `verifyPlayer` - Verify individual players
- `getTeamsPendingVerification` - Get verification queue
- `getTeamForVerification` - Get team details for verification

### 👤 User Management (`users.ts`)
- `createUserProfile` - Create user profiles
- `updateUserProfile` - Update user profiles
- `getUserProfile` - Get user profile data
- `updateLastLogin` - Update login timestamp
- `onUserCreated` - **Trigger**: Handle new user registration

## Environment Setup

### 1. Set Firebase Project
```bash
firebase use isha-gramotsavam
```

### 2. Check Current Project
```bash
firebase projects:list
```

### 3. View Function Logs
```bash
firebase functions:log
```

### 4. Test Locally (Optional)
```bash
firebase emulators:start --only functions,firestore
```

## Build and Deploy Process

### Development Workflow
```bash
# 1. Make changes to functions
# 2. Build TypeScript
npm run build

# 3. Test locally (optional)
npm run serve

# 4. Deploy to production
npm run deploy
```

### Production Deployment
```bash
# Build and deploy in one command
npm run deploy
```

## Function URLs
After deployment, functions will be available at:
```
https://asia-south1-isha-gramotsavam.cloudfunctions.net/[functionName]
```

## Security Notes

### Function Security
- All functions validate authentication
- Role-based access control implemented
- Input validation on all parameters
- Admin-only functions protected

### Firestore Rules Integration
- Functions use Admin SDK (bypass rules)
- Client calls subject to security rules
- Proper error handling and logging

## Monitoring

### Function Health
```bash
# View logs
firebase functions:log

# View specific function logs  
firebase functions:log --only promoteToTeamCaptain

# View recent logs
firebase functions:log --limit 100
```

### Performance Monitoring
- Check Firebase Console → Functions
- Monitor execution times
- Check error rates
- Set up alerts for failures

## Troubleshooting

### Common Issues

**1. Build Errors**
```bash
# Clean and rebuild
rm -rf lib/
npm run build
```

**2. Deployment Failures**
```bash
# Check Firebase project
firebase use --add

# Verify authentication
firebase login
```

**3. Function Not Found**
- Check function is exported in `index.ts`
- Verify build completed successfully
- Check deployment logs

**4. Permission Errors**
- Verify Firebase project permissions
- Check IAM roles in Google Cloud Console

### Debug Commands
```bash
# Check function status
firebase functions:list

# Get function info
firebase functions:log --only [functionName]

# Test function locally
firebase functions:shell
```

## Cost Optimization

### Function Optimization
- Functions set to `maxInstances: 10`
- Region set to `asia-south1` (closest to users)
- Efficient error handling to avoid timeouts
- Proper cleanup of resources

### Monitoring Costs
- Check Firebase Usage & Billing
- Monitor function invocations
- Set up billing alerts

## Next Steps

1. **Deploy Critical Functions First** (Fix Login Issue):
   ```bash
   firebase deploy --only functions:createUserProfile,functions:createPlayerUser
   ```

2. **Deploy Role Management Functions**:
   ```bash
   firebase deploy --only functions:onTeamCreated,functions:onPlayerAdded,functions:promoteToTeamCaptain,functions:promoteToPlayer
   ```

3. **Test Login Flow**:
   - Test phone number verification
   - Check user profile creation
   - Verify routing works

4. **Test Role Flow**:
   - Create team → check captain promotion
   - Add player → check player promotion

5. **Deploy Remaining Functions**:
   ```bash
   firebase deploy --only functions
   ```

6. **Monitor and Debug**:
   ```bash
   firebase functions:log --limit 50
   ```

## Recommended Deployment Order

1. **Role Functions** (critical for user flow)
2. **Team Functions** (for team creation)
3. **User Functions** (for profile management)
4. **Storage Functions** (for file uploads)
5. **Verification Functions** (for admin workflow)

This structure is **perfect** and follows Firebase best practices! 🎉