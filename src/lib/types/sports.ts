import { Timestamp } from 'firebase/firestore';

export interface Sport {
  // Basic Information
  sportId: string;
  name: string; // e.g., "Volleyball"
  displayName: string;
  description: string;
  
  // Sport Configuration
  category: 'individual' | 'team';
  genderCategories: ('men' | 'women')[];
  
  // Team Requirements
  minPlayers: number;
  maxPlayers: number;
  minSubstitutes: number;
  maxSubstitutes: number;
  
  // Age Restrictions (Gramotsavam specific)
  minAge: number; // Minimum 13/14 years
  maxAge?: number;
  maxPlayersUnder21: number; // Max 3 players under 21
  allowPET: boolean; // Physical Education Trainer allowed
  
  // Geographic Restrictions
  restrictedToStates: string[]; // e.g., Kabaddi only in Tamil Nadu
  
  // Scoring System
  scoringSystem: {
    pointsToWin: number;
    setsToWin?: number;
    timeLimit?: number; // in minutes
    customRules: string[];
  };
  
  // Media & Assets
  iconURL: string;
  bannerImageURL?: string;
  rulesPDF?: string;
  
  // Availability
  isActive: boolean;
  availableInEvents: string[]; // Array of event IDs
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScoringSystem {
  pointsToWin: number;
  setsToWin?: number;
  timeLimit?: number; // in minutes
  customRules: string[];
}

// Utility types for sport operations
export interface CreateSportData extends Omit<Sport, 'sportId' | 'createdAt' | 'updatedAt'> {
  // Required fields for creating a new sport
}

export interface UpdateSportData extends Partial<Omit<Sport, 'sportId' | 'createdAt'>> {
  // All fields except sportId and createdAt are optional for updates
}

// Sport types for type safety
export type SportCategory = 'individual' | 'team';
export type GenderCategory = 'men' | 'women';

// Legacy interfaces for backward compatibility
export interface LegacySportConfig {
  maxPlayers: number;
  maxSubstitutes: number;
  genderCategory: string;
}