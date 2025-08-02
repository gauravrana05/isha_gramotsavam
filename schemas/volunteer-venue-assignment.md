# Volunteer Venue Assignment Schema Documentation

## Collection: `volunteerVenueAssignment/{assignmentId}`

### Overview
Assigns volunteers to venues for verification, checkin, and media management during tournament events.

### Document Structure

```typescript
interface VolunteerVenueAssignment {
  assignmentId: string;
  eventId: string;
  
  // Volunteer Information
  volunteerId: string;
  volunteerName: string;
  volunteerType: 'verification' | 'checkin' | 'media';
  
  // Venue Assignment
  venueId: string;
  venueName: string;
  
  // Contact
  contactPhone: string;
  
  // Status
  status: 'assigned' | 'confirmed' | 'active';
  
  // Audit Fields
  assignedBy: string;
  assignedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Data

```javascript
{
  assignmentId: 'vol_assignment_001',
  eventId: 'isha_gramotsavam_2025',
  
  volunteerId: 'volunteer_001',
  volunteerName: 'Ravi Kumar',
  volunteerType: 'verification',
  
  venueId: 'coimbatore_sports_complex',
  venueName: 'Coimbatore Sports Complex',
  
  contactPhone: '+91-9876543210',
  
  status: 'confirmed',
  
  assignedBy: 'admin_001',
  assignedAt: Timestamp.now(),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
```

### Volunteer Types
- **verification**: Handles document verification and team eligibility
- **checkin**: Manages team check-in process at venues
- **media**: Handles media coverage and social media updates

### Usage
- Admin assigns volunteers to venues through UI
- Volunteers receive notifications of their assignments
- Volunteers confirm their availability and assignment
- Status tracking throughout the event

### Related Collections
- **users**: Volunteer user profiles
- **venues**: Venue information and requirements
- **teams**: Teams being verified/checked in