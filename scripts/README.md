# Firebase Database Setup for Isha Gramotsavam

This directory contains scripts to initialize the Firebase database with all the necessary data for the Isha Gramotsavam sports management application.

## 🚀 Quick Setup

### Prerequisites
1. Firebase project created
2. Firebase configuration added to your environment variables
3. Node.js and npm installed

### Step 1: Configure Firebase
Update your `.env.local` file with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Step 2: Install Dependencies
```bash
npm install firebase
```

### Step 3: Run Database Initialization
```bash
# Simple setup with essential data
npm run firebase:init

# Or run directly
node scripts/run-firebase-init.js
```

## 📊 What Gets Created

### 1. **Main Event: Isha Gramotsavam 2025**
- Event details and configuration
- Registration dates: Jan 1 - Feb 15, 2025
- Event dates: March 1-7, 2025
- Total prize pool: ₹3,00,000

### 2. **Sports Configuration**
- **Volleyball (Men)**: 6v6, ₹1,00,000 prize pool
- **Volleyball (Women)**: 6v6, ₹1,00,000 prize pool  
- **Throwball (Women)**: 7v7, ₹1,00,000 prize pool

### 3. **Venues**
- **Isha Sports Complex**: Main outdoor venue (500 capacity)
- **Community Center**: Indoor courts (200 capacity)

### 4. **System Configuration**
- Registration settings
- Payment configuration
- Verification rules
- File upload limits

## 🏗️ Database Structure

```
isha_gramotsavam/
├── events/
│   └── isha_gramotsavam_2025
├── sports/
│   ├── volleyball_men
│   ├── volleyball_women
│   └── throwball_women
├── venues/
│   ├── isha_main_ground
│   └── community_center
├── system/
│   └── config
├── users/
│   └── (user documents)
├── teams/
│   └── (team documents)
└── analytics/
    └── (analytics data)
```

## 🔧 Scripts Available

### `run-firebase-init.js`
Main initialization script that sets up:
- Events
- Sports
- Venues  
- System configuration

### `firebase-init.js`
Comprehensive setup script with:
- Sample users
- Sample teams
- Analytics data
- More detailed configurations

### `init-sports-data.ts`
TypeScript version with better type safety and detailed sports configuration.

## 🎯 Sports Details

### Volleyball (Men & Women)
- **Team Size**: 6 players + 2 substitutes
- **Age Limit**: 16-35 years
- **Format**: Best of 5 sets (25 points each)
- **Registration Fee**: ₹500 per team
- **Prizes**: 1st: ₹50,000, 2nd: ₹30,000, 3rd: ₹20,000

### Throwball (Women)
- **Team Size**: 7 players + 2 substitutes  
- **Age Limit**: 16-35 years
- **Format**: Best of 3 sets (15 points each)
- **Registration Fee**: ₹500 per team
- **Prizes**: 1st: ₹50,000, 2nd: ₹30,000, 3rd: ₹20,000

## 📋 Required Documents
For all sports:
- Valid government ID proof (Aadhar/PAN/Driving License)
- Recent passport-size photograph
- Medical fitness certificate
- Team photograph with all players

## 🚨 Important Notes

1. **Firebase Configuration**: Make sure to update the Firebase config in the scripts with your actual project details
2. **Security Rules**: Set up proper Firestore security rules before going live
3. **Storage Setup**: Configure Firebase Storage for document and image uploads
4. **Authentication**: Set up Firebase Auth for user management
5. **Backup**: Always backup your database before running initialization scripts

## 🔒 Security Considerations

Before deploying to production:

1. Set up Firestore Security Rules
2. Configure proper user authentication
3. Set up file upload validation
4. Enable audit logging
5. Configure backup schedules

## 📞 Support

For issues with the database setup:
1. Check Firebase console for errors
2. Verify your Firebase configuration
3. Ensure proper permissions are set
4. Check network connectivity

## 🎉 After Setup

Once the database is initialized:
1. Users can register and create accounts
2. Team captains can register teams
3. Admin panel will have access to all management features
4. Analytics and reporting will start collecting data

Your Isha Gramotsavam 2025 platform is ready to go! 🏆