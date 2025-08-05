// User types based on schemas/user.md

export type UserRole = 
  | 'admin' 
  | 'captain' 
  | 'player' 
  | 'general_volunteer' 
  | 'technical_volunteer' 
  | 'verification_volunteer';

export type Gender = 'M' | 'F' | 'O';

export interface DocumentInfo {
  storagePath: string;
  verified: boolean;
  uploadedAt: any; // Firestore Timestamp or null
  uploadedBy: string | null;
  url: string | null;
}

export interface UserDocuments {
  profilePhoto: DocumentInfo;
  aadhaarFront: DocumentInfo;
  aadhaarBack: DocumentInfo;
  teamPhoto: DocumentInfo;
}

export interface User {
  // Firebase Auth UID
  uid: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string; // YYYY-MM-DD format
  gender: Gender;
  
  // Geographic Information (Required for eligibility)
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  preferredLanguage: string;
  instagramHandle: string;
  
  // Account Information
  role: UserRole;
  currentTeamId?: string; // For players/captains currently in a team
  
  // Status Fields
  isProfileComplete: boolean;
  isVerified: boolean;
  
  // Document Management
  documents: UserDocuments;
  
  // Audit Fields
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

// Alias for backward compatibility and easier usage
export type UserProfile = User;

// Form data types for profile creation/editing
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string;
  gender: Gender;
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;

}

// Document upload form data
export interface DocumentUploadData {
  profilePhoto: File | null;
  aadhaarFront: File | null;
  aadhaarBack: File | null;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
}

// Helper functions for user eligibility
export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const isUserEligible = (user: User): boolean => {
  // Check age (16-35 years)
  const age = calculateAge(user.dob);
  const ageEligible = age >= 16 && age <= 35;
  
  // Check if profile complete and verified
  const profileReady = user.isProfileComplete && user.isVerified;
  
  // Check if all documents are verified
  const docsVerified = user.documents.profilePhoto.verified && 
                      user.documents.aadhaarFront.verified && 
                      user.documents.aadhaarBack.verified;
  
  return ageEligible && profileReady && docsVerified;
};

// Get missing documents for a user
export const getMissingDocuments = (user: User): Array<keyof UserDocuments> => {
  const missing: Array<keyof UserDocuments> = [];
  
  if (!user.documents.profilePhoto.storagePath) missing.push('profilePhoto');
  if (!user.documents.aadhaarFront.storagePath) missing.push('aadhaarFront');
  if (!user.documents.aadhaarBack.storagePath) missing.push('aadhaarBack');
  
  return missing;
};

// Check if user has all required documents
export const hasAllDocuments = (user: User): boolean => {
  return user.documents.profilePhoto.storagePath !== '' &&
         user.documents.aadhaarFront.storagePath !== '' &&
         user.documents.aadhaarBack.storagePath !== '';
};