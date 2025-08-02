# Team Venue Assignment Schema Documentation

## Collection: `teamVenueAssignment/{teamId}`

### Overview
Tracks team assignments to venues throughout their tournament progression from cluster to division to final levels.

### Document Structure

```typescript
interface TeamVenueAssignment {
  teamId: string;
  eventId: string;
  
  // Team Location (basis for assignment)
  teamLocation: {
    panchayat: string;
    taluk: string;
    district: string;
    state: string;
  };
  
  // Current Venue Assignment
  currentLevel: 'cluster' | 'division' | 'final';
  clusterVenueId: string;
  clusterVenueName: string;
  divisionVenueId?: string; // Set when team qualifies
  divisionVenueName?: string;
  
  // Assignment Status
  assignmentMethod: 'auto_assigned' | 'manual_assigned';
  assignedBy: string;
  assignedAt: Timestamp;
  
  // Qualification Status
  clusterQualified: boolean;
  divisionQualified: boolean;
  finalQualified: boolean;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Data

```javascript
{
  teamId: 'team_rural_warriors_001',
  eventId: 'isha_gramotsavam_2025',
  
  teamLocation: {
    panchayat: 'Annur',
    taluk: 'Coimbatore North',
    district: 'Coimbatore',
    state: 'Tamil Nadu'
  },
  
  currentLevel: 'division',
  clusterVenueId: 'coimbatore_sports_complex',
  clusterVenueName: 'Coimbatore Sports Complex',
  divisionVenueId: 'chennai_division_venue',
  divisionVenueName: 'Chennai Division Sports Complex',
  
  assignmentMethod: 'auto_assigned',
  assignedBy: 'system',
  assignedAt: Timestamp.now(),
  
  clusterQualified: true,
  divisionQualified: false,
  finalQualified: false,
  
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Assignment Logic
1. **Initial Assignment**: Teams auto-assigned to cluster venues based on location
2. **Cluster Qualification**: Top 2 teams advance to division venue (via cluster-division mapping)
3. **Division Qualification**: Top 2 teams advance to final venue (Isha Yoga Center)
4. **Manual Override**: Admins can manually reassign teams if needed

### Usage
- Created when teams are verified and confirmed
- Updated as teams progress through tournament levels
- Used to determine which fixtures teams participate in
- Provides venue information for team notifications

### Related Collections
- **teams**: Team details and location information
- **venues**: Venue details for assignments
- **venueLocationMapping**: Rules for location-based assignment
- **clusterDivisionMapping**: Progression paths between levels
- **fixtures**: Tournament brackets and matches