import { Timestamp } from 'firebase/firestore';

export interface Team {
  // Team Identification
  teamId: string;
  name: string;
  description: string;
  
  // Event & Sport Association
  eventId?: string;
  sportId: string;
  sportName: string;
  genderCategory: 'men' | 'women' | 'mixed';
  
  // Geographic Information
  panchayat: string;
  taluk: string;  
  district: string;
  state: string;
  
  // Team Capacity
  maxPlayers: number;
  maxSubstitutes: number;
  currentPlayers: number;
  currentSubstitutes: number;
  
  // Captain Information
  captainId: string;
  captainProfile: {
    name: string;
    phone: string;
    panchayat: string;
    district: string;
    state: string;
    documents: {
      profilePhoto: TeamDocument;
      aadhaarFront: TeamDocument;
      aadhaarBack: TeamDocument;
    };
  };
  
  // Players Array
  players: TeamPlayer[];
  
  // Team Status
  status: 'draft' | 'submitted' | 'verified' | 'rejected';
  verifiedAt: string | null; // ISO string
  verifiedBy: string | null;
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: string; // ISO string
}

export interface TeamPlayer {
  playerId: string;
  userId: string;
  teamId: string;
  name: string;
  phone: string;
  dob: string; // YYYY-MM-DD format
  age: number;
  gender: 'M' | 'F' | 'O';
  position: 'main' | 'substitute';
  
  // Profile Data
  profileData: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    village: string;
    panchayat: string;
    taluk: string;
    district: string;
    state: string;
    pincode: string;
  };
  
  // Documents
  documents: {
    profilePhoto: TeamDocument;
    aadhaarFront: TeamDocument;
    aadhaarBack: TeamDocument;
  };
  
  // Player Status
  profileComplete: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationComments: string[];
  
  // Audit
  addedAt: string; // ISO string
  addedBy: string; // 'self' or userId
}

export interface TeamDocument {
  storagePath: string;
  url: string | null;
  verified: boolean;
  uploadedAt: Timestamp | null;
  uploadedBy: string | null;
}

// Utility types for team operations
export interface CreateTeamData extends Omit<Team, 'teamId' | 'createdAt' | 'updatedAt' | 'currentPlayers' | 'currentSubstitutes' | 'players' | 'status' | 'verifiedAt' | 'verifiedBy'> {
  // Required fields for creating a new team
}

export interface UpdateTeamData extends Partial<Omit<Team, 'teamId' | 'createdAt'>> {
  // All fields except teamId and createdAt are optional for updates
}

export interface AddPlayerData extends Omit<TeamPlayer, 'playerId' | 'addedAt' | 'profileComplete' | 'verificationStatus' | 'verificationComments' | 'documents'> {
  // Required fields for adding a player to team
}

// Team status types for type safety
export type TeamStatus = 'draft' | 'submitted' | 'verified' | 'rejected';
export type PlayerPosition = 'main' | 'substitute';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type GenderCategory = 'men' | 'women' | 'mixed';