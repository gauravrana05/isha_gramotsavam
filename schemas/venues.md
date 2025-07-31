# Venues Schema Documentation

## Collection: `venues/{venueId}`

### Overview
Tournament-focused venue management system for Isha Gramotsavam with multi-level venue types, real-time status tracking, and efficient staff coordination.

### Document Structure

```typescript
interface Venue {
  // Basic Information
  venueId: string;
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  
  // Location
  address: string;
  pincode: string;
  district: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  
  // Sports Configuration
  supportedSports: Array<{
    sportId: string;
    sportName: string;
    courtCount: number;
    courtSpecifications: string;
  }>;
  
  // Contact Information
  primaryContact: {
    name: string;
    phone: string;
    email?: string;
    role: string;
  };
  
  // Staff Assignments
  assignedVolunteers: string[]; // Array of user IDs
  officials: {
    coordinatorId?: string;
    referees: string[];
    medicalOfficer?: string;
  };
  
  // Status & Utilization
  isActive: boolean;
  currentStatus: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  totalMatchesHosted: number;
  upcomingMatches: number;
  utilizationRate: number;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Venue Data

```javascript
{
  venueId: 'venue_isha_main_001',
  name: 'Isha Sports Complex - Main Arena',
  shortName: 'ISC Main',
  type: 'final',  // This venue hosts final-level matches
  
  address: 'Isha Yoga Center, Velliangiri Foothills, Coimbatore',
  pincode: '641114',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  coordinates: {
    latitude: 11.0168,
    longitude: 76.9558
  },
  
  supportedSports: [
    {
      sportId: 'volleyball_men',
      sportName: 'Volleyball (Men)',
      courtCount: 2,
      courtSpecifications: 'Professional synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    },
    {
      sportId: 'volleyball_women',
      sportName: 'Volleyball (Women)',
      courtCount: 2,
      courtSpecifications: 'Professional synthetic surface, 18m x 9m, LED lighting, electronic scoreboard'
    },
    {
      sportId: 'throwball_women',
      sportName: 'Throwball (Women)',
      courtCount: 1,
      courtSpecifications: 'Concrete surface, 12.2m x 18.3m, LED lighting, manual scoreboard'
    }
  ],
  
  primaryContact: {
    name: 'Rajesh Kumar',
    phone: '+91 9876543210',
    email: 'rajesh.kumar@isha.org',
    role: 'Venue Manager'
  },
  
  assignedVolunteers: [
    'volunteer_001',
    'volunteer_002',
    'volunteer_003',
    'volunteer_004'
  ],
  
  officials: {
    coordinatorId: 'admin_venue_001',
    referees: ['referee_001', 'referee_002', 'referee_003'],
    medicalOfficer: 'medical_officer_001'
  },
  
  isActive: true,
  currentStatus: 'available',
  totalMatchesHosted: 45,
  upcomingMatches: 12,
  utilizationRate: 78.5,
  
  createdAt: Timestamp.fromDate(new Date('2024-12-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-20T14:30:00Z'))
}
```

### Sample Cluster-Level Venue

```javascript
{
  venueId: 'venue_cluster_kondampatti_001',
  name: 'Kondampatti Village Sports Ground',
  shortName: 'KVG',
  type: 'cluster',  // Cluster-level venue
  
  address: 'Village Sports Ground, Kondampatti, Sulur Taluk',
  pincode: '641109',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  coordinates: {
    latitude: 11.0890,
    longitude: 76.9950
  },
  
  supportedSports: [
    {
      sportId: 'volleyball_men',
      sportName: 'Volleyball (Men)',
      courtCount: 1,
      courtSpecifications: 'Concrete surface, 18m x 9m, basic lighting, manual scoreboard'
    },
    {
      sportId: 'throwball_women',
      sportName: 'Throwball (Women)',
      courtCount: 1,
      courtSpecifications: 'Concrete surface, 12.2m x 18.3m, basic lighting'
    }
  ],
  
  primaryContact: {
    name: 'Murugan Selvam',
    phone: '+91 9876543220',
    role: 'Village Sports Coordinator'
  },
  
  assignedVolunteers: ['volunteer_005', 'volunteer_006'],
  
  officials: {
    coordinatorId: 'volunteer_general_001',
    referees: ['referee_004'],
    medicalOfficer: null
  },
  
  isActive: true,
  currentStatus: 'available',
  totalMatchesHosted: 8,
  upcomingMatches: 4,
  utilizationRate: 45.2,
  
  createdAt: Timestamp.fromDate(new Date('2024-12-15T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2025-01-18T09:15:00Z'))
}
```

### Key Features

#### 1. **Tournament-Level Organization**
- `type: 'cluster' | 'division' | 'final'` - Directly maps to tournament structure
- Venues aligned with 3-level competition hierarchy
- Appropriate facilities and staffing for each level
- Clear venue classification for match scheduling

#### 2. **Sports-Specific Configuration**
- Embedded sports configuration with court count and specifications
- Sport-specific requirements clearly defined
- Court count per sport for scheduling optimization
- Equipment and facility requirements per sport

#### 3. **Real-Time Status Management**
- `currentStatus` for live venue availability tracking
- `utilizationRate` for performance monitoring
- `upcomingMatches` for scheduling visibility
- `totalMatchesHosted` for usage history

#### 4. **Efficient Staff Coordination**
- Direct volunteer assignments via user IDs
- Essential official roles: coordinator, referees, medical officer
- Clear contact person for venue coordination
- Streamlined communication structure

#### 5. **Geographic and Logistical Clarity**
- Essential location information for navigation
- Coordinates for mapping and distance calculations
- District/state information for administrative purposes
- Simple address structure for practical use

### Validation Rules

#### Required Fields
- `venueId`, `name`, `shortName`, `type`
- `address`, `pincode`, `district`, `state`
- `coordinates` (latitude, longitude)
- `supportedSports` (at least one sport)
- `primaryContact` (name, phone, role)
- `isActive`, `currentStatus`

#### Business Rules
- `type` must be one of: 'cluster', 'division', 'final'
- Each sport in `supportedSports` must have `courtCount > 0`
- `currentStatus` must be valid status enum
- `utilizationRate` must be between 0-100
- Coordinates must be valid lat/lng values

#### Staff Requirements
- `assignedVolunteers` must reference valid user IDs with volunteer roles
- `officials.referees` must reference users with referee qualifications
- `primaryContact` must have valid Indian phone number format

#### Tournament Level Requirements
- **Cluster venues**: Basic facilities, at least 1 court per supported sport
- **Division venues**: Enhanced facilities, multiple courts, medical officer recommended
- **Final venues**: Professional facilities, multiple courts, full official staff required

### Security Considerations

#### Access Control
- Venue coordinators can update operational information via `coordinatorId`
- Admin users can modify all venue details and staff assignments
- Volunteers can view assigned venue information
- Public users can view basic venue and contact information

#### Data Integrity
- Coordinate validation for mapping accuracy
- Staff ID validation against user collection
- Status consistency checks for availability
- Tournament type alignment with venue capabilities

### Usage Examples

#### Creating a New Venue
```javascript
const newVenue = {
  id: 'new_venue_001',
  basicInfo: {
    name: 'New Sports Ground',
    type: 'outdoor',
    category: 'secondary'
  },
  location: {
    address: '123 Sports Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: { latitude: 13.0827, longitude: 80.2707 }
  },
  // ... other required fields
};

await setDoc(doc(db, 'venues', newVenue.id), newVenue);
```

#### Finding Available Venues for a Sport
```javascript
const availableVenues = await getDocs(
  query(
    collection(db, 'venues'),
    where('sportsSupported', 'array-contains', 'volleyball_men'),
    where('status', '==', 'active'),
    where('availability.currentlyAvailable', '==', true)
  )
);
```

#### Checking Venue Capacity
```javascript
const checkCapacityAdequacy = (venue, expectedAttendance) => {
  return venue.capacity.total >= expectedAttendance;
};
```

#### Scheduling Maintenance
```javascript
const scheduleMaintenance = async (venueId, maintenanceData) => {
  await updateDoc(doc(db, 'venues', venueId), {
    'availability.maintenanceSchedule': arrayUnion(maintenanceData),
    'status': 'maintenance',
    'updatedAt': serverTimestamp()
  });
};
```

### Related Collections
- **events**: Events are held at venues
- **sports**: Venues support specific sports
- **matches**: Matches are played at venues
- **teams**: Teams are assigned to venues
- **fixtures**: Tournament fixtures specify venues

### Indexes Required
- `sportsSupported` - for sport-specific venue queries
- `status` - for filtering active venues
- `location.city` - for location-based searches
- `capacity.total` - for capacity-based filtering
- `basicInfo.type` - for venue type queries
- `availability.currentlyAvailable` - for availability queries