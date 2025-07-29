// src/lib/types/auth.ts

// --- User and Auth Related Types ---

export type UserRole = 
  | 'player' 
  | 'captain' 
  | 'volunteer_general' 
  | 'volunteer_technical' 
  | 'verification_volunteer'
  | 'admin' 
  | 'guest' 
  | 'public';

export type AadhaarStatus = 'pending' | 'verified' | 'rejected';

export type SupportedLanguage = 'en' | 'ta' | 'hi' | 'ml' | 'te' | 'kn' | 'or';

// This interface represents the user data stored in Firestore
export interface UserProfile {
  uid: string;
  phoneNumber: string;
  role: UserRole;
  assignedVenues: string[]; // Array of venueIds for volunteers
  name: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  instagramHandle: string;
  whatsappNumber: string;
  profilePhotoURL: string;
  aadhaarStatus: AadhaarStatus;
  // Updated to potentially store URLs for both front and back
  aadhaarFrontURL?: string; 
  aadhaarBackURL?: string;  
  preferredLanguage: SupportedLanguage;
  isProfileComplete: boolean;
  isVerified?: boolean;
  
  // Address information
  village: string;
  panchayat: string; // Added
  block?: string;    // Added (Optional)
  taluk?: string;    // Added (Optional)
  district: string;
  state: string;
  pincode?: string;
  
  // Timestamps
  createdAt: Date; // Or string if stored as ISO string
  updatedAt: Date; // Or string if stored as ISO string
}

// --- Form Data Types ---

// Data submitted during the initial login step
export interface LoginFormData {
  phoneNumber: string;
}

// Data submitted during OTP verification
export interface OTPFormData {
  otp: string;
}

// Data submitted during profile setup (Complete Profile page)
// This is the type used in the CompleteProfilePage component and addressValidation utils
export interface ProfileSetupFormData {
  name: string;
  village: string;
  panchayat: string; // Added
  block: string;     // Added
  taluk: string;     // Added
  district: string;
  state: string;
  pincode?: string; // Optional as it might not be entered yet
  preferredLanguage: SupportedLanguage;
  // Files selected for upload (can be null if not selected)
  aadhaarFrontPhoto: File | null; 
  aadhaarBackPhoto: File | null;  
  profilePhoto: File | null;
}

// Data submitted during Aadhaar verification (if separate from profile setup)
export interface AadhaarVerificationData {
  // Could be Files or potentially base64 strings depending on implementation
  aadhaarFront: File | null; 
  aadhaarBack: File | null;  
  profilePhoto: File | null; // Might be included here or in ProfileSetupFormData
}

// --- Validation Error Types ---

// General structure for form validation errors
export interface ValidationError {
  field: string; // Name of the field with the error
  message: string; // Human-readable error message
}

// Specific structure for address/profile form validation errors
// (Used in the addressValidation.ts utility functions we discussed)
export interface AddressValidationError {
  // keyof ProfileSetupFormData ensures field names match the form data keys
  field: keyof ProfileSetupFormData; 
  message: string;
}
