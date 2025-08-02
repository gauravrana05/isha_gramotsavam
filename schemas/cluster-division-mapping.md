# Cluster Division Mapping Schema Documentation

## Collection: `clusterDivisionMapping/{mappingId}`

### Overview
Maps cluster venues to division venues, defining the progression path for teams advancing from cluster level to division level competitions.

### Document Structure

```typescript
interface ClusterDivisionMapping {
  mappingId: string;
  eventId: string;
  
  // Cluster Venue
  clusterVenueId: string;
  clusterVenueName: string;
  
  // Division Venue (where winners advance)
  divisionVenueId: string;
  divisionVenueName: string;
  
  // Status
  isActive: boolean;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Data

```javascript
{
  mappingId: 'cluster_div_coimbatore_chennai',
  eventId: 'isha_gramotsavam_2025',
  
  clusterVenueId: 'coimbatore_sports_complex',
  clusterVenueName: 'Coimbatore Sports Complex',
  
  divisionVenueId: 'chennai_division_venue',
  divisionVenueName: 'Chennai Division Sports Complex',
  
  isActive: true,
  
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Usage
- Admin defines which division venue each cluster venue advances to
- When cluster fixtures complete, top 2 winners automatically advance
- System uses this mapping to assign teams to division fixtures
- Division venues serve multiple cluster venues
- Final venues are pre-defined (Isha Yoga Center)

### Related Collections
- **venues**: Both cluster and division venue details
- **fixtures**: Cluster fixtures feed into division fixtures
- **teamVenueAssignment**: Updated when teams advance levels