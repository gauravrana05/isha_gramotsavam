# Teams Schema Documentation

## Collection: `teams`

### Overview
Clean and efficient team management system for Isha Gramotsavam with embedded player data, captain profile, and streamlined verification workflow.

### Document Structure

```typescript
interface Team {
  // Team Identification
  teamId: string;
  name: string;
  description: string;
  
  // Event & Sport Association
  eventId: string;
  sportId: string;
  sportName: string;
  genderCategory: 'men' | 'women' | 'mixed';
  
  // Geographic Information
  panchayat: string;
  taluk: string;  
  district: string;
  state: string;
  
  // Team Capacity
  maxPlayers: number;
  maxSubstitutes: number;
  currentPlayers: number;
  currentSubstitutes: number;
  
  // Captain Information
  captainId: string;
  captainProfile: {
    name: string;
    phone: string;
    panchayat: string;
    district: string;
    state: string;
    documents: {
      profilePhoto: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
      aadhaarFront: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
      aadhaarBack: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
    };
  };
  
  // Players Array
  players: Array<{
    playerId: string;
    userId: string;
    teamId: string;
    name: string;
    phone: string;
    dob: string; // YYYY-MM-DD format
    age: number;
    gender: 'M' | 'F' | 'O';
    position: 'main' | 'substitute';
    
    // Profile Data
    profileData: {
      firstName: string;
      lastName: string;
      whatsappNumber: string;
      village: string;
      panchayat: string;
      taluk: string;
      district: string;
      state: string;
      pincode: string;
    };
    
    // Documents
    documents: {
      profilePhoto: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
      aadhaarFront: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
      aadhaarBack: {
        storagePath: string;
        url: string | null;
        verified: boolean;
        uploadedAt: Timestamp | null;
        uploadedBy: string | null;
      };
    };
    
    // Player Status
    profileComplete: boolean;
    verificationStatus: 'pending' | 'approved' | 'rejected';
    verificationComments: string[];
    
    // Audit
    addedAt: string; // ISO string
    addedBy: string; // 'self' or userId
  }>;
  
  // Team Status
  status: 'draft' | 'submitted' | 'verified' | 'rejected';
  verifiedAt: string | null; // ISO string
  verifiedBy: string | null;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: string; // ISO string
}
```

### Sample Team Data

```javascript
{
  teamId: 'team_rural_warriors_001',
  name: 'Rural Warriors',
  description: 'A dedicated volleyball team from Kondampatti village representing rural sports excellence',
  
  eventId: 'isha_gramotsavam_2025',
  sportId: 'volleyball_men',
  sportName: 'Volleyball (Men)',
  genderCategory: 'men',
  
  panchayat: 'Kondampatti Panchayat',
  taluk: 'Sulur',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  
  maxPlayers: 6,
  maxSubstitutes: 6,
  currentPlayers: 6,
  currentSubstitutes: 2,
  
  captainId: 'captain_rural_001',
  captainProfile: {
    name: 'Murugan Selvam',
    phone: '+91 9876543210',
    panchayat: 'Kondampatti Panchayat',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    documents: {
      profilePhoto: {
        storagePath: 'teams/team_rural_warriors_001/captain/profile.jpg',
        url: 'https://storage.googleapis.com/...',
        verified: true,
        uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:00:00Z')),
        uploadedBy: 'admin_001'
      },
      aadhaarFront: {
        storagePath: 'teams/team_rural_warriors_001/captain/aadhaar_front.jpg',
        url: 'https://storage.googleapis.com/...',
        verified: true,
        uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:05:00Z')),
        uploadedBy: 'admin_001'
      },
      aadhaarBack: {
        storagePath: 'teams/team_rural_warriors_001/captain/aadhaar_back.jpg',
        url: 'https://storage.googleapis.com/...',
        verified: true,
        uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:05:00Z')),
        uploadedBy: 'admin_001'
      }
    }
  },
  
  players: [
    {
      playerId: 'player_001',
      userId: 'captain_rural_001',
      teamId: 'team_rural_warriors_001',
      name: 'Murugan Selvam',
      phone: '+91 9876543210',
      dob: '1992-08-22',
      age: 32,
      gender: 'M',
      position: 'main',
      
      profileData: {
        firstName: 'Murugan',
        lastName: 'Selvam',
        whatsappNumber: '+91 9876543210',
        village: 'Kondampatti',
        panchayat: 'Kondampatti Panchayat',
        taluk: 'Sulur',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641109'
      },
      
      documents: {
        profilePhoto: {
          storagePath: 'teams/team_rural_warriors_001/players/player_001/profile.jpg',
          url: 'https://storage.googleapis.com/...',
          verified: true,
          uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:00:00Z')),
          uploadedBy: 'admin_001'
        },
        aadhaarFront: {
          storagePath: 'teams/team_rural_warriors_001/players/player_001/aadhaar_front.jpg',
          url: 'https://storage.googleapis.com/...',
          verified: true,
          uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:05:00Z')),
          uploadedBy: 'admin_001'
        },
        aadhaarBack: {
          storagePath: 'teams/team_rural_warriors_001/players/player_001/aadhaar_back.jpg',
          url: 'https://storage.googleapis.com/...',
          verified: true,
          uploadedAt: Timestamp.fromDate(new Date('2025-01-20T10:05:00Z')),
          uploadedBy: 'admin_001'
        }
      },
      
      profileComplete: true,
      verificationStatus: 'approved',
      verificationComments: ['All documents verified', 'Age eligibility confirmed'],
      
      addedAt: '2025-01-20T09:30:00Z',
      addedBy: 'self'
    }
    // ... more players
  ],
  
  status: 'verified',
  verifiedAt: '2025-01-22T14:30:00Z',
  verifiedBy: 'admin_001',
  
  createdAt: Timestamp.fromDate(new Date('2025-01-20T09:30:00Z')),
  updatedAt: '2025-01-22T14:30:00Z'
}
```

### Key Features

#### 1. **Embedded Data Architecture**
- `captainProfile` embedded for fast access without joins
- Complete player `profileData` embedded in team document
- Document information duplicated for performance optimization
- Single query gives complete team information

#### 2. **Smart Capacity Management**
- Clear tracking: `maxPlayers/maxSubstitutes` vs `currentPlayers/currentSubstitutes`
- `position: 'main' | 'substitute'` for clear player roles
- Automatic capacity validation and limits

#### 3. **Geographic Consistency**
- Team location: `panchayat → taluk → district → state`
- Captain geographic info embedded
- Player geographic data in `profileData`
- Easy eligibility verification across all levels

#### 4. **Document Management**
- Both `storagePath` and `url` for flexibility
- Individual verification per document
- Clear audit trail with `uploadedBy` and `uploadedAt`
- Consistent document structure across captain and players

#### 5. **Streamlined Verification**
- Simple status flow: `draft → submitted → verified → rejected`
- Individual player verification with comments
- Team-level verification tracking
- Clear verification audit trail

### Validation Rules

#### Required Fields
- `teamId`, `name`, `description`
- `eventId`, `sportId`, `sportName`, `genderCategory`
- `panchayat`, `taluk`, `district`, `state`
- `maxPlayers`, `maxSubstitutes`
- `captainId` and complete `captainProfile`
- At least minimum players based on sport requirements

#### Business Rules
- Team name must be unique within the event
- `currentPlayers` ≤ `maxPlayers`
- `currentSubstitutes` ≤ `maxSubstitutes`
- Captain must be one of the players in the `players` array
- All players must meet age requirements (16-35 years)
- Team geographic location must match captain's location

#### Player Requirements
- Each player must have `profileComplete: true` before team submission
- Individual player verification required
- `position: 'main'` count must not exceed sport-specific limits
- Age calculated from `dob` field must be within 16-35 range

#### Document Requirements
- All captain documents must be verified before team approval
- Each player must have all three documents uploaded
- Document `storagePath` must be valid Firebase Storage path

### Security Considerations

#### Access Control
- Team captains can modify their team information via `captainId`
- Admin users can verify and approve teams through verification workflow
- Player data access restricted based on team membership

#### Data Privacy
- Document storage uses secure Firebase Storage paths
- Personal information access controlled by role-based rules
- Geographic data used only for eligibility verification

#### Document Security
- Both `storagePath` and `url` provide secure access control
- Verification trail maintained with `uploadedBy` tracking
- Document verification requires admin privileges

### Usage Examples

#### Creating a New Team
```javascript
const newTeam = {
  teamId: 'team_new_warriors_001',
  name: 'New Warriors',
  description: 'A passionate volleyball team from rural Tamil Nadu',
  
  eventId: 'isha_gramotsavam_2025',
  sportId: 'volleyball_men',
  sportName: 'Volleyball (Men)',
  genderCategory: 'men',
  
  panchayat: 'Kondampatti Panchayat',
  taluk: 'Sulur',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  
  maxPlayers: 6,
  maxSubstitutes: 6,
  currentPlayers: 0,
  currentSubstitutes: 0,
  
  captainId: 'captain_new_001',
  captainProfile: {
    name: 'Captain Name',
    phone: '+91 9876543210',
    panchayat: 'Kondampatti Panchayat',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    documents: {
      // Initialize empty document structure
    }
  },
  
  players: [],
  status: 'draft',
  verifiedAt: null,
  verifiedBy: null,
  
  createdAt: serverTimestamp(),
  updatedAt: new Date().toISOString()
};

await setDoc(doc(db, 'teams', newTeam.teamId), newTeam);
```

#### Adding a Player to Team
```javascript
const addPlayerToTeam = async (teamId, playerData) => {
  const newPlayer = {
    playerId: `player_${Date.now()}`,
    userId: playerData.userId,
    teamId: teamId,
    name: playerData.name,
    phone: playerData.phone,
    dob: playerData.dob,
    age: calculateAge(playerData.dob),
    gender: playerData.gender,
    position: playerData.position, // 'main' or 'substitute'
    
    profileData: {
      firstName: playerData.firstName,
      lastName: playerData.lastName,
      whatsappNumber: playerData.whatsappNumber,
      // ... other profile data
    },
    
    documents: {
      // Initialize empty document structure
    },
    
    profileComplete: false,
    verificationStatus: 'pending',
    verificationComments: [],
    
    addedAt: new Date().toISOString(),
    addedBy: playerData.addedBy || 'self'
  };

  await updateDoc(doc(db, 'teams', teamId), {
    players: arrayUnion(newPlayer),
    currentPlayers: increment(playerData.position === 'main' ? 1 : 0),
    currentSubstitutes: increment(playerData.position === 'substitute' ? 1 : 0),
    updatedAt: new Date().toISOString()
  });
};
```

#### Verifying Team
```javascript
const verifyTeam = async (teamId, adminId) => {
  await updateDoc(doc(db, 'teams', teamId), {
    status: 'verified',
    verifiedAt: new Date().toISOString(),
    verifiedBy: adminId,
    updatedAt: new Date().toISOString()
  });
};
```

#### Querying Teams by Status
```javascript
const getTeamsBySport = async (sportId, status = null) => {
  let q = query(
    collection(db, 'teams'),
    where('sportId', '==', sportId)
  );
  
  if (status) {
    q = query(q, where('status', '==', status));
  }
  
  return await getDocs(q);
};
```

#### Checking Team Eligibility
```javascript
const checkTeamEligibility = (team) => {
  // Check if team has minimum players
  const hasMinPlayers = team.currentPlayers >= 6; // For volleyball
  
  // Check if all players are verified
  const allPlayersVerified = team.players.every(
    player => player.verificationStatus === 'approved'
  );
  
  // Check captain verification
  const captainVerified = team.captainProfile.documents.profilePhoto.verified &&
                         team.captainProfile.documents.aadhaarFront.verified &&
                         team.captainProfile.documents.aadhaarBack.verified;
  
  return hasMinPlayers && allPlayersVerified && captainVerified;
};
```

### Related Collections
- **users**: Team captain and players reference user documents via `captainId` and `players[].userId`
- **sports**: Teams are associated with specific sports via `sportId`
- **events**: Teams participate in events via `eventId`
- **matches**: Teams play matches (referenced by `teamId`)

### Indexes Required
- `sportId` - for sport-specific queries
- `status` - for verification workflows
- `captainId` - for captain-based queries
- `eventId` - for event-specific team queries
- `panchayat` - for geographic filtering
- `district` - for district-based queries