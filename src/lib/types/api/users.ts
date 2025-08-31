import { BaseEntity } from '../shared/common';
import { UserRole, Gender, VolunteerType } from '../shared/enums';

// User API response types
export interface UserData extends BaseEntity {
  uid: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
  gender: Gender | null;
  panchayat: string | null;
  taluk: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  venueAssignmentId: string | null;
  profileComplete: boolean;
  dateOfBirth: string | null;
  whatsappNumber: string | null;
  instagramHandle: string | null;
  languagePreference: string | null;
  userProfileImages?: {
    id: string;
    imageUrl: string;
  } | null;
}

export interface AdminUserRow extends BaseEntity {
  uid: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string;
  email: string | undefined;
  role: UserRole;
  gender: Gender | null;
  panchayat: string | null;
  taluk: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  venueAssignmentId: string | null;
  isVerified: boolean;
}

export interface AdminVolunteerRow extends BaseEntity {
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string | undefined;
  role: VolunteerType;
  gender: Gender;
  panchayat: string | null;
  district: string | null;
  state: string | null;
  taluk: string | null;
  pincode: string | null;
  venueAssignment?: {
    id: string;
    venue: {
      name: string;
      district: string;
      state: string;
    };
  } | null;
}
