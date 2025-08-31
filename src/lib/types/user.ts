export interface UserDocument {
  id: string;
  type: 'id_proof' | 'address_proof' | 'photo';
  url: string;
  verified: boolean;
  uploadedAt: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'M' | 'F' | 'O';
  panchayat?: string;
  taluk?: string;
  district?: string;
  state?: string;
  pincode?: string;
  role: string;
  profileComplete: boolean;
  documents?: UserDocument[];
  instagramHandle?: string;
  preferredLanguage?: string;
}
