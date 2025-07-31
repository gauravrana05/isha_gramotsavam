# Events Schema Documentation

## Collection: `events/{eventId}`

### Overview
Clean and focused event management system for Isha Gramotsavam with essential tournament structure, sports configuration, and operational management.

### Document Structure

```typescript
interface Event {
  // Basic Information
  eventId: string;
  name: string; // e.g., "Isha Gramotsavam 2025"
  description: string;
  year: number;
  
  // Event Timeline
  registrationStartDate: Timestamp;
  registrationEndDate: Timestamp;
  eventStartDate: Timestamp;
  eventEndDate: Timestamp;
  
  // Tournament Structure
  tournamentLevels: ('cluster' | 'division' | 'final')[];
  maxTeamsPerCluster: number; // Max 30 teams per cluster
  advancementRules: {
    clusterToDiv: number; // Top 2 teams advance
    divToFinal: number;
  };
  
  // Sports Configuration
  activeSports: Array<{
    sportId: string;
    sportName: string;
    isActive: boolean;
    genderCategories: ('men' | 'women' | 'mixed')[];
    maxTeamsPerCategory: number;
    registrationDeadline: Timestamp;
  }>;
  
  // Prize Structure
  prizes: Array<{
    level: 'cluster' | 'division' | 'final';
    position: 'winner' | 'runner_up' | 'third';
    prizeAmount?: number;
    prizeDescription: string;
  }>;
  
  // Logistics
  venues: string[]; // Array of venue IDs
  providesFood: boolean;
  providesAccommodation: boolean;
  travelAllowanceFromLevel: 'cluster' | 'division' | 'final';
  
  // Registration Requirements
  requiresAadhaar: boolean;
  teamCompositionRules: {
    samePanchayat: boolean;
    excludeMunicipalities: boolean;
    allowPlayerChangesAfterCluster: boolean;
  };
  
  // Media & Communication
  bannerImageURL?: string;
  livestreamURL?: string;
  youtubeChannelId?: string;
  socialMediaHandles: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Status
  status: 'draft' | 'registration_open' | 'registration_closed' | 'cluster_matches' | 'division_matches' | 'finals' | 'completed';
  isPublic: boolean;
  isFeatured: boolean;
  
  // Contact Information
  supportPhone: string;
  supportEmail: string;
  
  // Statistics (calculated fields)
  totalRegistrations: number;
  totalTeamsVerified: number;
  totalMatches: number;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Event Data

```javascript
{
  eventId: 'isha_gramotsavam_2025',
  name: 'Isha Gramotsavam 2025',
  description: 'Annual rural sports festival celebrating traditional games and community spirit',
  year: 2025,
  
  registrationStartDate: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
  registrationEndDate: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
  eventStartDate: Timestamp.fromDate(new Date('2025-03-01T06:00:00Z')),
  eventEndDate: Timestamp.fromDate(new Date('2025-03-15T20:00:00Z')),
  
  tournamentLevels: ['cluster', 'division', 'final'],
  maxTeamsPerCluster: 30,
  advancementRules: {
    clusterToDiv: 2, // Top 2 teams advance
    divToFinal: 2
  },
  
  activeSports: [
    {
      sportId: 'volleyball_men',
      sportName: 'Volleyball (Men)',
      isActive: true,
      genderCategories: ['men'],
      maxTeamsPerCategory: 64,
      registrationDeadline: Timestamp.fromDate(new Date('2025-02-10T23:59:59Z'))
    },
    {
      sportId: 'volleyball_women',
      sportName: 'Volleyball (Women)',
      isActive: true,
      genderCategories: ['women'],
      maxTeamsPerCategory: 64,
      registrationDeadline: Timestamp.fromDate(new Date('2025-02-10T23:59:59Z'))
    },
    {
      sportId: 'throwball_women',
      sportName: 'Throwball (Women)',
      isActive: true,
      genderCategories: ['women'],
      maxTeamsPerCategory: 32,
      registrationDeadline: Timestamp.fromDate(new Date('2025-02-10T23:59:59Z'))
    }
  ],
  
  prizes: [
    {
      level: 'final',
      position: 'winner',
      prizeAmount: 50000,
      prizeDescription: 'Championship Trophy + Cash Prize'
    },
    {
      level: 'final',
      position: 'runner_up',
      prizeAmount: 25000,
      prizeDescription: 'Runner-up Trophy + Cash Prize'
    },
    {
      level: 'division',
      position: 'winner',
      prizeAmount: 10000,
      prizeDescription: 'Division Winner Trophy + Cash Prize'
    }
  ],
  
  venues: ['venue_isha_main_001', 'venue_cluster_kondampatti_001'],
  providesFood: true,
  providesAccommodation: true,
  travelAllowanceFromLevel: 'division',
  
  requiresAadhaar: true,
  teamCompositionRules: {
    samePanchayat: true,
    excludeMunicipalities: true,
    allowPlayerChangesAfterCluster: false
  },
  
  bannerImageURL: 'https://storage.googleapis.com/isha-gramotsavam/banners/2025-main.jpg',
  livestreamURL: 'https://youtube.com/live/isha-gramotsavam-2025',
  youtubeChannelId: 'UCIshaGramotsavam',
  socialMediaHandles: {
    facebook: 'IshaGramotsavam',
    instagram: '@isha_gramotsavam',
    twitter: '@IshaGramotsavam'
  },
  
  status: 'registration_open',
  isPublic: true,
  isFeatured: true,
  
  supportPhone: '+91 422 2515345',
  supportEmail: 'support@gramotsavam.isha.org',
  
  totalRegistrations: 425,
  totalTeamsVerified: 380,
  totalMatches: 186,
  
  createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-20T14:30:00Z'))
}
```

### Key Features

#### 1. **Multi-Level Tournament Structure**
- Simple 3-level progression: cluster → division → final
- Clear advancement rules with team limits
- Configurable maximum teams per cluster
- Tournament level tracking for venue and match management

#### 2. **Sports Configuration**
- Active sports management with gender categories
- Individual registration deadlines per sport
- Maximum teams per category for capacity planning
- Sport-specific status tracking

#### 3. **Logistics Management**
- Essential support services: food, accommodation, travel allowance
- Venue assignment and management
- Travel allowance eligibility from specific tournament levels
- Simple boolean flags for operational planning

#### 4. **Registration Requirements**
- Clear team composition rules (same panchayat, exclude municipalities)
- Aadhaar requirement flag
- Player change restrictions after cluster level
- Simple eligibility verification

#### 5. **Media and Communication**
- Essential media assets (banner, livestream, social media)
- Public visibility and featured event management
- Support contact information
- Social media integration

### Validation Rules

#### Required Fields
- `eventId`, `name`, `description`, `year`
- `registrationStartDate`, `registrationEndDate`, `eventStartDate`, `eventEndDate`
- `tournamentLevels` (at least one level)
- `activeSports` (at least one sport)
- `status`, `supportPhone`, `supportEmail`

#### Business Rules
- `registrationEndDate` must be before `eventStartDate`
- `eventEndDate` must be after `eventStartDate`
- `maxTeamsPerCluster` must be > 0
- `advancementRules.clusterToDiv` and `divToFinal` must be ≤ `maxTeamsPerCluster`
- Each `sportId` in `activeSports` must reference valid sport

#### Tournament Rules
- `tournamentLevels` must be in logical order
- `maxTeamsPerCategory` must be > 0 for each sport
- Prize levels must match tournament levels
- Advancement rules must be consistent with team limits

### Security Considerations

#### Access Control
- Admin users can create and modify events
- Captain and volunteer users can view event details
- Public users can view events marked as `isPublic: true`
- Featured events have enhanced visibility

#### Data Integrity
- Date validation and chronological consistency
- Sport ID validation against sports collection
- Venue ID validation against venues collection
- Status workflow validation

### Usage Examples

#### Creating a New Event
```javascript
const newEvent = {
  eventId: 'new_tournament_2025',
  name: 'New Tournament 2025',
  description: 'Community sports tournament',
  year: 2025,
  registrationStartDate: serverTimestamp(),
  registrationEndDate: Timestamp.fromDate(new Date('2025-06-01')),
  eventStartDate: Timestamp.fromDate(new Date('2025-06-15')),
  eventEndDate: Timestamp.fromDate(new Date('2025-06-20')),
  tournamentLevels: ['cluster', 'division', 'final'],
  maxTeamsPerCluster: 30,
  advancementRules: { clusterToDiv: 2, divToFinal: 2 },
  activeSports: [{
    sportId: 'volleyball_men',
    sportName: 'Volleyball (Men)',
    isActive: true,
    genderCategories: ['men'],
    maxTeamsPerCategory: 32,
    registrationDeadline: Timestamp.fromDate(new Date('2025-05-30'))
  }],
  // ... other required fields
  status: 'draft',
  isPublic: false,
  isFeatured: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

await setDoc(doc(db, 'events', newEvent.eventId), newEvent);
```

#### Querying Active Events
```javascript
const activeEvents = await getDocs(
  query(
    collection(db, 'events'),
    where('status', 'in', ['registration_open', 'cluster_matches', 'division_matches']),
    where('isPublic', '==', true)
  )
);
```

#### Getting Featured Events
```javascript
const featuredEvents = await getDocs(
  query(
    collection(db, 'events'),
    where('isFeatured', '==', true),
    where('status', '!=', 'completed'),
    orderBy('eventStartDate', 'asc')
  )
);
```

### Related Collections
- **sports**: Events reference sports via `activeSports[].sportId`
- **teams**: Teams register for events via `eventId`
- **venues**: Events use venues via `venues[]` array
- **matches**: Matches belong to events
- **fixtures**: Tournament fixtures for the event

### Indexes Required
- `status` - for filtering events by status
- `year` - for year-based queries
- `eventStartDate` - for chronological queries
- `isPublic` - for public event filtering
- `isFeatured` - for featured event queries
- `activeSports.sportId` - for sport-specific event queries