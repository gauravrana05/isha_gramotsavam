# Cluster Division Mapping Schema Documentation

## Collection: `clusterDivisionMapping/{mappingId}`

### Overview
Maps cluster venues to division venues, defining the progression path for teams advancing from cluster level to division level competitions. Similar to venue location mapping, this stores grouped mappings with one document per division venue containing arrays of assigned cluster venues.

### Document Structure

```typescript
interface ClusterDivisionMapping {
  mappingId: string;
  eventId: string;
  
  // Division Venue Information
  divisionVenueId: string;
  divisionVenueName: string;
  venueType: 'division';
  
  // Assigned Clusters (similar to assignedLocations in venue location mapping)
  assignedClusters: {
    state: string;
    clusterVenueIds: string[];
    clusterVenueNames: string[];
  };
  
  // Status & Metadata
  isActive: boolean;
  autoMapped: boolean; // true if all clusters in state have single division
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Data

```javascript
{
  mappingId: 'division_mapping_chennai_tn',
  eventId: 'isha_gramotsavam_2025',
  
  divisionVenueId: 'chennai_division_venue',
  divisionVenueName: 'Chennai Division Sports Complex',
  venueType: 'division',
  
  assignedClusters: {
    state: 'Tamil Nadu',
    clusterVenueIds: [
      'coimbatore_sports_complex',
      'tirupur_grounds',
      'salem_stadium'
    ],
    clusterVenueNames: [
      'Coimbatore Sports Complex',
      'Tirupur Sports Ground', 
      'Salem Stadium'
    ]
  },
  
  isActive: true,
  autoMapped: false,
  
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Usage
- Admin creates grouped mappings by division venue (one document per division)
- Each division venue can serve multiple cluster venues within the same state
- When cluster fixtures complete, top 2 winners automatically advance
- System uses this mapping to assign teams to division fixtures
- Auto-mapping occurs for states with single division venues
- Final venues are pre-defined (Isha Yoga Center)

### Related Collections
- **venues**: Both cluster and division venue details
- **fixtures**: Cluster fixtures feed into division fixtures
- **teamVenueAssignment**: Updated when teams advance levels