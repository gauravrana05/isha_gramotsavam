// src/lib/types/sports.ts

export interface TeamConfig {
  minPlayers: number;         // Minimum required players
  maxPlayers: number;         // Maximum main players
  maxSubstitutes: number;     // Maximum substitute players
  totalTeamSize: number;      // minPlayers + maxSubstitutes
}

export interface Eligibility {
  genderRestriction: 'male' | 'female' | 'any';
  minAge: number;
  maxAge: number;
  requireSamePanchayat: boolean;
  customRules: string[];      // Additional rules as text
}

export interface PrizePool {
  first: number;
  second: number;
  third: number;
  currency: string;
}

export interface EventInfo {
  registrationStart: string;  // ISO date
  registrationEnd: string;    // ISO date
  eventStart: string;         // ISO date
  eventEnd: string;           // ISO date
  venue: string;
  prizePool: PrizePool;
}

export interface SportAssets {
  primaryImage: string;       // Main sport image URL
  thumbnailImage: string;     // Small preview image
  galleryImages: string[];    // Additional images
  rulesDocument?: string;     // PDF/document URL
  videoUrl?: string;          // Promotional video
}

export interface Sport {
  // Identifiers
  sportId: string;           // 'volleyball', 'throwball', etc.
  name: string;             // 'Volleyball'
  displayName: string;      // 'Volleyball Championship'
  
  // Basic Info
  description: string;
  category: 'men' | 'women' | 'mixed';
  status: 'active' | 'inactive' | 'upcoming';
  
  // Team Configuration
  teamConfig: TeamConfig;
  
  // Eligibility Rules
  eligibility: Eligibility;
  
  // Event Information
  eventInfo: EventInfo;
  
  // Display Assets
  assets: SportAssets;
  
  // Administrative
  createdBy: string;          // Admin user ID
  createdAt: string;          // ISO date
  updatedAt: string;          // ISO date
  version: number;            // For tracking changes
}

export interface SportSeason {
  seasonId: string;           // '2025', '2026'
  year: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  
  // Override sport config for this season
  teamConfigOverride?: Partial<TeamConfig>;
  eligibilityOverride?: Partial<Eligibility>;
  eventInfoOverride?: Partial<EventInfo>;
  
  // Season-specific data
  registeredTeams: number;
  maxTeams?: number;
  
  createdAt: string;
  updatedAt: string;
}

// For backward compatibility with existing code
export interface LegacySportConfig {
  maxPlayers: number;
  maxSubstitutes: number;
  genderCategory: string;
}

// Utility type for creating new sports
export interface CreateSportData extends Omit<Sport, 'createdAt' | 'updatedAt' | 'version' | 'createdBy'> {
  // All fields except auto-generated ones
}

// Utility type for updating sports
export interface UpdateSportData extends Partial<Omit<Sport, 'sportId' | 'createdAt' | 'createdBy' | 'version'>> {
  // All fields except immutable ones, all optional
}