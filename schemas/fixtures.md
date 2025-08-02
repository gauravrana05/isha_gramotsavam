# Fixtures Schema Documentation

## Collection: `fixtures/{fixtureId}`

### Overview
Simplified tournament fixture management for Isha Gramotsavam's three-tier tournament structure (cluster → division → final) with location-based team assignment and knockout format.

### Document Structure

```typescript
interface Fixture {
  // Basic Information
  fixtureId: string;
  name: string; // e.g., "Volleyball Men's - Coimbatore District Cluster"
  
  // Event & Sport Association
  eventId: string;
  sportId: string;
  sportName: string;
  genderCategory: 'men' | 'women';
  
  // Tournament Level
  level: 'cluster' | 'division' | 'final';
  
  // Venue Assignment
  venueId: string;
  venueName: string;
  
  // Team Management
  assignedTeams: string[]; // Teams assigned to this fixture
  checkedInTeams: string[]; // Teams that checked in at venue
  
  // Tournament Structure (Simple Knockout)
  bracket: {
    matches: FixtureMatch[];
    winners: string[]; // Top 2 team IDs advancing to next level
  };
  
  // Status
  status: 'draft' | 'teams_assigned' | 'in_progress' | 'completed';
  
  // Results
  finalStandings: {
    teamId: string;
    position: number;
    qualifiesForNext: boolean;
  }[];
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FixtureMatch {
  matchId: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  roundName: string; // "Quarter Final", "Semi Final", "Final"
  status: 'scheduled' | 'in_progress' | 'completed';
```

### Sample Fixture Data

```javascript
{
  fixtureId: 'cluster_volleyball_men_coimbatore',
  name: 'Volleyball Men\'s - Coimbatore District Cluster',
  eventId: 'isha_gramotsavam_2025',
  sportId: 'volleyball',
  sportName: 'Volleyball',
  genderCategory: 'men',
  level: 'cluster',
  venueId: 'coimbatore_sports_complex',
  venueName: 'Coimbatore Sports Complex',
  
  assignedTeams: ['team_001', 'team_002', 'team_003', 'team_004'],
  checkedInTeams: ['team_001', 'team_002'],
  
  bracket: {
    matches: [
      {
        matchId: 'match_001',
        team1Id: 'team_001',
        team2Id: 'team_002',
        winnerId: 'team_001',
        roundName: 'Semi Final 1',
        status: 'completed'
      }
    ],
    winners: ['team_001', 'team_003']
  },
  
  status: 'in_progress',
  
  finalStandings: [
    {
      teamId: 'team_001',
      position: 1,
      qualifiesForNext: true
    }
  ],
  
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
```

### Related Collections
- **events**: Fixtures belong to events
- **venues**: Fixtures are assigned to venues
- **teams**: Teams are assigned to fixtures
- **venueLocationMapping**: Maps venues to locations for team assignment
- **clusterDivisionMapping**: Maps cluster venues to division venues
- **teamVenueAssignment**: Tracks team assignments to venues