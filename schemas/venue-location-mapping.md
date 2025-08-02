# Venue Location Mapping Schema Documentation

## Collection: `venueLocationMapping/{mappingId}`

### Overview
Maps venues to geographic locations for automatic team assignment based on team location. Supports hierarchical location mapping at state, district, taluk, and panchayat levels.

### Document Structure

```typescript
interface VenueLocationMapping {
  mappingId: string;
  eventId: string;
  
  // Venue Information
  venueId: string;
  venueName: string;
  venueType: 'cluster' | 'division'; // finals don't need mapping
  
  // Location Assignment (hierarchical)
  assignedLocations: {
    state?: string;
    districts?: string[];
    taluks?: string[];
    panchayats?: string[];
  };
  
  // Capacity
  maxTeams: number;
  
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
  mappingId: 'mapping_coimbatore_cluster',
  eventId: 'isha_gramotsavam_2025',
  
  venueId: 'coimbatore_sports_complex',
  venueName: 'Coimbatore Sports Complex',
  venueType: 'cluster',
  
  assignedLocations: {
    state: 'Tamil Nadu',
    districts: ['Coimbatore', 'Tirupur'],
    taluks: ['Coimbatore North', 'Coimbatore South', 'Tirupur'],
    panchayats: ['Annur', 'Mettupalayam']
  },
  
  maxTeams: 32,
  isActive: true,
  
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Usage
- Admin creates venue-location mappings through UI
- When teams are verified, system looks up their location
- Teams are automatically assigned to matching cluster venues
- If multiple venues serve same location, load balancing applies
- Venue capacity limits are enforced

### Related Collections
- **venues**: Venue details and information
- **teams**: Teams have location data for assignment
- **teamVenueAssignment**: Results of automatic assignment