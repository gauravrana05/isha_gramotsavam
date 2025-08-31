import { BaseEntity } from '../shared/common';
import { GenderCategory, TeamStatus, Gender } from '../shared/enums';

// Team API response types
export interface TeamData extends BaseEntity {
  name: string;
  description: string | null;
  genderCategory: GenderCategory;
  status: TeamStatus;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  eventId: string;
  sportId: string;
  captainId: string;
  verifiedAt: string | null;
  submittedAt?: Date;
  sportName?: string;
  captainProfile?: {
    name: string;
    phone: string;
  };
  maxPlayers?: number;
  currentPlayers?: number;
  _count?: {
    players: number;
  };
}

export interface TeamPlayer extends BaseEntity {
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  whatsappNumber: string | null;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  teamId: string;
  userId: string;
  position: string | null;
  isSubstitute: boolean;
  status: 'verified' | 'rejected' | 'pending' | 'approved';
  verifiedAt: string | null;
  addedBy: string;
}

export interface TeamAssignmentData extends BaseEntity {
  name: string;
  description: string | null;
  sport: { name: string };
  captain: {
    name: string;
    phone: string;
    district: string;
    state: string;
    taluk: string;
    panchayat: string;
  };
  assignment?: {
    venueId: string;
    venueName: string;
    assignmentMethod: 'auto_assigned' | 'manual_required';
    assignmentLevel: 'cluster' | 'division' | 'final';
  };
  genderCategory: GenderCategory;
  status: TeamStatus;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  eventId: string;
  sportId: string;
  captainId: string;
  verifiedAt: string | null;
  captainUser: {
    firstName: string | null;
    lastName: string | null;
  };
}
