import { Timestamp } from 'firebase/firestore';

export interface Event {
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
  activeSports: EventSport[];
  
  // Prize Structure
  prizes: EventPrize[];
  
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

export interface EventSport {
  sportId: string;
  sportName: string;
  isActive: boolean;
  genderCategories: ('men' | 'women' | 'mixed')[];
  maxTeamsPerCategory: number;
  registrationDeadline: Timestamp;
}

export interface EventPrize {
  level: 'cluster' | 'division' | 'final';
  position: 'winner' | 'runner_up' | 'third';
  prizeAmount?: number;
  prizeDescription: string;
}

export interface AdvancementRules {
  clusterToDiv: number; // Top 2 teams advance
  divToFinal: number;
}

export interface TeamCompositionRules {
  samePanchayat: boolean;
  excludeMunicipalities: boolean;
  allowPlayerChangesAfterCluster: boolean;
}

export interface SocialMediaHandles {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

// Utility types for event operations
export interface CreateEventData extends Omit<Event, 'eventId' | 'createdAt' | 'updatedAt' | 'totalRegistrations' | 'totalTeamsVerified' | 'totalMatches'> {
  // Required fields for creating a new event
}

export interface UpdateEventData extends Partial<Omit<Event, 'eventId' | 'createdAt'>> {
  // All fields except eventId and createdAt are optional for updates
}

// Event status types for type safety
export type EventStatus = 'draft' | 'registration_open' | 'registration_closed' | 'cluster_matches' | 'division_matches' | 'finals' | 'completed';
export type TournamentLevel = 'cluster' | 'division' | 'final';
export type PrizeLevel = 'cluster' | 'division' | 'final';
export type PrizePosition = 'winner' | 'runner_up' | 'third';
export type GenderCategory = 'men' | 'women' | 'mixed';