import { Timestamp } from 'firebase/firestore';

export interface Venue {
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
  supportedSports: VenueSport[];
  
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

export interface VenueSport {
  sportId: string;
  sportName: string;
  courtCount: number;
  courtSpecifications: string;
}

export interface VenueCoordinates {
  latitude: number;
  longitude: number;
}

export interface VenueContact {
  name: string;
  phone: string;
  email?: string;
  role: string;
}

export interface VenueOfficials {
  coordinatorId?: string;
  referees: string[];
  medicalOfficer?: string;
}

// Utility types for venue operations
export interface CreateVenueData extends Omit<Venue, 'venueId' | 'createdAt' | 'updatedAt' | 'totalMatchesHosted' | 'upcomingMatches' | 'utilizationRate'> {
  // Required fields for creating a new venue
}

export interface UpdateVenueData extends Partial<Omit<Venue, 'venueId' | 'createdAt'>> {
  // All fields except venueId and createdAt are optional for updates
}

// Venue status types for type safety
export type VenueType = 'cluster' | 'division' | 'final';
export type VenueStatus = 'available' | 'in_use' | 'maintenance' | 'unavailable';