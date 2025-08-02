import { Timestamp } from 'firebase/firestore';

export interface User {
  // Firebase Auth UID
  uid: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string; // YYYY-MM-DD format
  gender: 'M' | 'F' | 'O';
  
  // Geographic Information (Required for eligibility)
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  
  // Account Information
  role: 'admin' | 'captain' | 'player' | 'general_volunteer' | 'technical_volunteer' | 'verification_volunteer';
  currentTeamId?: string; // For players/captains currently in a team
  
  // Status Fields
  isProfileComplete: boolean;
  isVerified: boolean;
  
  // Document Management
  documents: {
    profilePhoto: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
    aadhaarFront: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
    aadhaarBack: {
      storagePath: string;
      verified: boolean;
      uploadedAt: Timestamp | null;
      uploadedBy: string | null;
    };
  };
  
  // Audit Fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Utility types for user operations
export interface CreateUserData extends Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'isProfileComplete' | 'isVerified' | 'documents'> {
  // Required fields for creating a new user
}

export interface UpdateUserData extends Partial<Omit<User, 'uid' | 'createdAt'>> {
  // All fields except uid and createdAt are optional for updates
}

export interface UserDocument {
  storagePath: string;
  verified: boolean;
  uploadedAt: Timestamp | null;
  uploadedBy: string | null;
}

// User role types for type safety
export type UserRole = 'admin' | 'captain' | 'player' | 'general_volunteer' | 'technical_volunteer' | 'verification_volunteer';
export type Gender = 'M' | 'F' | 'O';