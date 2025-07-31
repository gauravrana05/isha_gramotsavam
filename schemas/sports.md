# Sports Schema Documentation

## Collection: `sports/{sportId}`

### Overview
Clean and focused sports configuration for Isha Gramotsavam with essential rules, eligibility criteria, and tournament settings.

### Document Structure

```typescript
interface Sport {
  // Basic Information
  sportId: string;
  name: string; // e.g., "Volleyball"
  displayName: string;
  description: string;
  
  // Sport Configuration
  category: 'individual' | 'team';
  genderCategories: ('men' | 'women')[];
  
  // Team Requirements
  minPlayers: number;
  maxPlayers: number;
  minSubstitutes: number;
  maxSubstitutes: number;
  
  // Age Restrictions (Gramotsavam specific)
  minAge: number; // Minimum 13/14 years
  maxAge?: number;
  maxPlayersUnder21: number; // Max 3 players under 21
  allowPET: boolean; // Physical Education Trainer allowed
  
  // Geographic Restrictions
  restrictedToStates: string[]; // e.g., Kabaddi only in Tamil Nadu
  
  // Scoring System
  scoringSystem: {
    pointsToWin: number;
    setsToWin?: number;
    timeLimit?: number; // in minutes
    customRules: string[];
  };
  
  // Media & Assets
  iconURL: string;
  bannerImageURL?: string;
  rulesPDF?: string;
  
  // Availability
  isActive: boolean;
  availableInEvents: string[]; // Array of event IDs
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Sports Data

#### Volleyball (Men)
```javascript
{
  sportId: 'volleyball_men',
  name: 'Volleyball',
  displayName: 'Volleyball (Men)',
  description: 'Professional 6-a-side volleyball for men with traditional rules',
  
  category: 'team',
  genderCategories: ['men'],
  
  minPlayers: 6,
  maxPlayers: 6,
  minSubstitutes: 0,
  maxSubstitutes: 6,
  
  minAge: 16,
  maxAge: 35,
  maxPlayersUnder21: 3,
  allowPET: false,
  
  restrictedToStates: [], // Available in all states
  
  scoringSystem: {
    pointsToWin: 25,
    setsToWin: 3, // Best of 5 sets
    timeLimit: 90, // 90 minutes maximum
    customRules: [
      'Deuce rule: Must win by 2 points',
      'Final set plays to 15 points',
      'Maximum 2 timeouts per team per set'
    ]
  },
  
  iconURL: 'https://storage.googleapis.com/isha-gramotsavam/icons/volleyball.png',
  bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/volleyball-men.jpg',
  rulesPDF: 'https://storage.googleapis.com/isha-gramotsavam/rules/volleyball-rules.pdf',
  
  isActive: true,
  availableInEvents: ['isha_gramotsavam_2025'],
  
  createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-20T14:30:00Z'))
}
```

#### Throwball (Women)
```javascript
{
  sportId: 'throwball_women',
  name: 'Throwball',
  displayName: 'Throwball (Women)',
  description: 'Traditional 7-a-side throwball for women - authentic rural sport',
  
  category: 'team',
  genderCategories: ['women'],
  
  minPlayers: 7,
  maxPlayers: 7,
  minSubstitutes: 0,
  maxSubstitutes: 5,
  
  minAge: 16,
  maxAge: 35,
  maxPlayersUnder21: 3,
  allowPET: false,
  
  restrictedToStates: [], // Available in all states
  
  scoringSystem: {
    pointsToWin: 15,
    setsToWin: 2, // Best of 3 sets
    timeLimit: 60, // 60 minutes maximum
    customRules: [
      'Must win by 2 points',
      'Maximum 1 timeout per team per set',
      'Maximum 3 substitutions per set'
    ]
  },
  
  iconURL: 'https://storage.googleapis.com/isha-gramotsavam/icons/throwball.png',
  bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/throwball-women.jpg',
  rulesPDF: 'https://storage.googleapis.com/isha-gramotsavam/rules/throwball-rules.pdf',
  
  isActive: true,
  availableInEvents: ['isha_gramotsavam_2025'],
  
  createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-20T14:30:00Z'))
}
```

### Key Features

#### 1. **Essential Sport Configuration**
- Simple team/individual category classification
- Gender-specific categories (men, women)
- Clear player count requirements (min/max players and substitutes)
- Gramotsavam-specific age restrictions with under-21 limits

#### 2. **Flexible Geographic Rules**
- State-level restrictions for region-specific sports
- Physical Education Trainer allowance flag
- Event availability tracking

#### 3. **Streamlined Scoring System**
- Points to win and sets configuration
- Time limits for match duration
- Custom rules array for sport-specific regulations

#### 4. **Essential Media Assets**
- Sport icon and banner images
- Official rules PDF document
- Clean URL-based asset management

### Validation Rules

#### Required Fields
- `sportId`, `name`, `displayName`, `description`
- `category`, `genderCategories`
- `minPlayers`, `maxPlayers`, `minSubstitutes`, `maxSubstitutes`
- `minAge`, `maxPlayersUnder21`
- `scoringSystem` (pointsToWin required)
- `iconURL`, `isActive`

#### Business Rules
- `maxPlayersUnder21` must be ≤ 3
- `minAge` must be ≥ 13, `maxAge` (if provided) must be ≤ 35
- `maxPlayers` must be ≥ `minPlayers`
- `maxSubstitutes` must be ≥ `minSubstitutes`
- `genderCategories` must contain at least one category

### Security Considerations

#### Access Control
- Admin users can create and modify sport configurations
- All users can read active sports information
- Sport availability controlled by `isActive` flag
- Event association managed through `availableInEvents` array

#### Data Integrity
- Numeric field validation for player counts and ages
- URL validation for media assets
- Enum validation for category and gender fields
- Event ID validation against events collection

### Usage Examples

#### Creating a New Sport
```javascript
const newSport = {
  sportId: 'kabaddi_men',
  name: 'Kabaddi',
  displayName: 'Kabaddi (Men)',
  description: 'Traditional contact team sport',
  
  category: 'team',
  genderCategories: ['men'],
  
  minPlayers: 7,
  maxPlayers: 7,
  minSubstitutes: 0,
  maxSubstitutes: 5,
  
  minAge: 16,
  maxAge: 35,
  maxPlayersUnder21: 3,
  allowPET: false,
  
  restrictedToStates: ['Tamil Nadu'], // Kabaddi only in TN
  
  scoringSystem: {
    pointsToWin: 40,
    timeLimit: 40, // 2 halves of 20 minutes each
    customRules: ['Contact sport rules apply', 'Raiding and defending']
  },
  
  iconURL: 'https://storage.googleapis.com/isha-gramotsavam/icons/kabaddi.png',
  
  isActive: true,
  availableInEvents: ['isha_gramotsavam_2025'],
  
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

await setDoc(doc(db, 'sports', newSport.sportId), newSport);
```

#### Querying Active Sports
```javascript
const activeSports = await getDocs(
  query(
    collection(db, 'sports'),
    where('isActive', '==', true),
    where('availableInEvents', 'array-contains', 'isha_gramotsavam_2025')
  )
);
```

#### Checking Sport Eligibility
```javascript
const checkSportEligibility = (sport, playerAge, playerState) => {
  // Check age eligibility
  const ageEligible = playerAge >= sport.minAge && 
                     (!sport.maxAge || playerAge <= sport.maxAge);
  
  // Check state restrictions
  const stateEligible = sport.restrictedToStates.length === 0 || 
                       sport.restrictedToStates.includes(playerState);
  
  return ageEligible && stateEligible;
};
```

#### Getting Sports by Gender
```javascript
const getMensSports = async () => {
  const sportsQuery = query(
    collection(db, 'sports'),
    where('genderCategories', 'array-contains', 'men'),
    where('isActive', '==', true)
  );
  
  return await getDocs(sportsQuery);
};
```

### Related Collections
- **events**: Sports are available in events via `availableInEvents` array
- **teams**: Teams register for specific sports via `sportId`
- **venues**: Venues support sports via `supportedSports` array
- **matches**: Matches are played for specific sports

### Indexes Required
- `isActive` - for filtering active sports
- `genderCategories` - for gender-based queries
- `availableInEvents` - for event-specific sport queries
- `category` - for team/individual sport filtering
- `restrictedToStates` - for geographic sport availability