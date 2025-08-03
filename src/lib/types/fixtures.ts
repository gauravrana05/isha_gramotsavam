import { Timestamp } from 'firebase/firestore';

// Simplified Fixtures Schema for Three-Tier Tournament Structure
export interface Fixture {
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

export interface FixtureMatch {
  matchId: string;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  roundName: string; // "Quarter Final", "Semi Final", "Final"
  status: 'scheduled' | 'in_progress' | 'completed';
  dependsOnMatch?: string | null; // Match ID that this match depends on for team advancement
  nextMatchId?: string | null; // Match ID that this match depends on for team advancement
  nextSlot?: string | null; // Slot number that this match depends on for team advancement
}

// Standalone Match document for volunteers to update results
export interface Match {
  matchId: string;
  
  // Tournament Context
  fixtureId: string;
  fixtureName: string;
  eventId: string;
  sportId: string;
  sportName: string;
  genderCategory: 'men' | 'women';
  venueId: string;
  venueName: string;
  nextMatchId?: string | null; // Match ID that this match depends on for team advancement
  nextSlot?: string | null; // Slot number that this match depends on for team advancement
  
  // Match Details
  roundName: string; // "Quarter Final", "Semi Final", "Final"
  matchNumber: number; // Sequential number within the fixture
  
  // Teams
  team1: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  } | null;
  team2: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  } | null;
  
  // Result
  result?: {
    winnerId: string;
    winnerName: string;
    score?: {
      team1Score?: number;
      team2Score?: number;
      details?: string; // Additional score details
    };
    resultEnteredBy: string;
    resultEnteredAt: Timestamp;
  };
  
  // Dependencies (for knockout structure)
  dependsOn?: {
    match1Id?: string; // Winner of this match becomes team1
    match2Id?: string; // Winner of this match becomes team2
  };
  
  // Status
  status: 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Venue Location Mapping for Automatic Team Assignment
export interface VenueLocationMapping {
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

// Cluster to Division Venue Mapping
export interface ClusterDivisionMapping {
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

// Volunteer Assignment to Venues
export interface VolunteerVenueAssignment {
  assignmentId: string;
  eventId: string;
  
  // Volunteer Information
  volunteerId: string;
  volunteerName: string;
  volunteerType: 'technical_volunteer' | 'general_volunteer';
  
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

// Team Venue Assignment Tracking
export interface TeamVenueAssignment {
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