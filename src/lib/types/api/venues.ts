import { BaseEntity } from '../shared/common';
import { TournamentLevel, LocationType } from '../shared/enums';

// Venue API response types
export interface VenueData extends BaseEntity {
  name: string;
  address: string | null;
  district: string;
  state: string;
  panchayat?: string;
  taluk?: string;
  pincode?: string;
  isActive: boolean;
  eventId: string;
  levels: TournamentLevel[];
  maxTeams: number;
}

export interface LocationMappingData extends BaseEntity {
  eventId: string;
  locationType: LocationType;
  locationName: string;
  state: string;
  district: string | null;
  clusterVenueMappingId: string;
  venueLevelMapping?: {
    id: string;
    venue: {
      id: string;
      name: string;
      district: string;
      state: string;
      address: string;
    };
    level: 'cluster';
    maxTeams: number;
  };
}

export interface VenueMappingData extends BaseEntity {
  venue: {
    id: string;
    name: string;
    district: string;
    state: string;
    address: string | null;
  };
  eventId: string;
  venueId: string;
  level: TournamentLevel;
  maxTeams: number | null;
  isActive: boolean;
}

export interface ClusterDivisionMappingData extends BaseEntity {
  address: string | null;
  maxTeams: number | null;
}
