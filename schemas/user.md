# User Schema Documentation

## Collection: `users`

### Overview
Clean and focused user profile structure for Isha Gramotsavam participants with essential information for eligibility verification and team management.

### Document Structure

```typescript
interface User {
  // Firebase Auth UID
  uid: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string; // YYYY-MM-DD format
  gender: 'M' | 'F' | 'O';
  
  // Geographic Information (Required for eligibility)
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  
  // Account Information
  role: 'admin' | 'captain' | 'player' | 'volunteer_general' | 'volunteer_technical | volunteer_verification';
  currentTeamId?: string; // For players/captains currently in a team
  
  // Status Fields
  isProfileComplete: boolean;
  isVerified: boolean;
  
  // Document Management
  documents: {
    profilePhoto: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
    aadhaarFront: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
    aadhaarBack: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
  };
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Key Features

#### 1. **Geographic Eligibility**
- Complete address hierarchy: `village → panchayat → taluk → district → state`
- Geographic restrictions based on panchayat/district residence
- Essential for Gramotsavam's rural participation model

#### 2. **Minimal Document Requirements**
- Only essential documents: Profile photo + Aadhaar (front & back)
- Simple verification workflow with boolean flags
- Storage path reference instead of direct URLs

#### 3. **Clean Role System**
- Five focused roles: admin, captain, player, volunteer_general, volunteer_technical
- `currentTeamId` for easy team association tracking
- No complex permission arrays - keep it simple

#### 4. **Status Tracking**
- `isProfileComplete` - Whether all required fields are filled
- `isVerified` - Whether user has been verified by admin
- Document-level verification tracking

#### 5. **Practical Contact Management**
- Separate `phoneNumber` and `whatsappNumber` (very common in India)
- Simple date format (YYYY-MM-DD) instead of complex Timestamp
- Gender as single character codes (M/F/O)

### Validation Rules

#### Required Fields
- `firstName`, `lastName`
- `phoneNumber`, `whatsappNumber` 
- `dob`, `gender`
- `village`, `panchayat`, `taluk`, `district`, `state`, `pincode`
- `role`
- All document `storagePath` fields (can be empty string initially)

#### Age Restrictions
- Minimum age: 16 years
- Maximum age: 35 years
- Age calculated from `dob` field (YYYY-MM-DD format)

#### Document Requirements
- **Profile Photo**: Required for all users
- **Aadhaar Front**: Required for identity verification
- **Aadhaar Back**: Required for complete identity verification
- All documents must be uploaded before user can be marked as verified

#### Business Rules
- `isProfileComplete` = true only when all required fields are filled
- `isVerified` = true only after admin verification
- `currentTeamId` should reference a valid team document
- Phone numbers should be valid Indian mobile numbers

### Security Considerations

#### Data Privacy
- Documents stored using Firebase Storage paths, not direct URLs
- Geographic information used only for eligibility verification
- Personal data access restricted by role-based rules

#### Document Security
- All documents stored in secure Firebase Storage
- Access controlled through security rules
- Verification trail maintained with `uploadedBy` tracking

### Usage Examples

#### Creating a New User
```javascript
const newUser = {
  uid: 'user_12345',
  firstName: 'Raj',
  lastName: 'Kumar',
  phoneNumber: '+91 9876543210',
  whatsappNumber: '+91 9876543210',
  dob: '1995-06-15',
  gender: 'M',
  village: 'Kondampatti',
  panchayat: 'Kondampatti Panchayat',
  taluk: 'Sulur',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641109',
  role: 'player',
  currentTeamId: null,
  isProfileComplete: false,
  isVerified: false,
  documents: {
    profilePhoto: {
      storagePath: '',
      verified: false,
      uploadedAt: null,
      uploadedBy: null
    },
    aadhaarFront: {
      storagePath: '',
      verified: false,
      uploadedAt: null,
      uploadedBy: null
    },
    aadhaarBack: {
      storagePath: '',
      verified: false,
      uploadedAt: null,
      uploadedBy: null
    }
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};
```

#### Verifying User Documents
```javascript
const verifyUserDocuments = async (userId, adminId) => {
  await updateDoc(doc(db, 'users', userId), {
    'documents.profilePhoto.verified': true,
    'documents.profilePhoto.uploadedBy': adminId,
    'documents.aadhaarFront.verified': true,
    'documents.aadhaarFront.uploadedBy': adminId,
    'documents.aadhaarBack.verified': true,
    'documents.aadhaarBack.uploadedBy': adminId,
    'isVerified': true,
    'updatedAt': serverTimestamp()
  });
};
```

#### Checking User Eligibility
```javascript
const checkUserEligibility = (user) => {
  // Check age (16-35 years)
  const age = calculateAge(user.dob);
  const ageEligible = age >= 16 && age <= 35;
  
  // Check if profile complete and verified
  const profileReady = user.isProfileComplete && user.isVerified;
  
  // Check if all documents are verified
  const docsVerified = user.documents.profilePhoto.verified && 
                      user.documents.aadhaarFront.verified && 
                      user.documents.aadhaarBack.verified;
  
  return ageEligible && profileReady && docsVerified;
};
```

### Related Collections
- **teams**: Users can be team members via `currentTeamId`
- **audit_logs**: All user modifications are logged
- **media**: Profile photos and document storage

### Indexes Required
- `role` - for role-based queries
- `isVerified` - for admin verification workflows
- `panchayat` - for geographic eligibility checks
- `district` - for district-based filtering
- `currentTeamId` - for team membership queries