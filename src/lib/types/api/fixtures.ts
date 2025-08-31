import { BaseEntity } from '../shared/common';
import { GenderCategory, FixtureStatus, TournamentLevel } from '../shared/enums';

// Fixture API response types
export interface FixtureData extends BaseEntity {
  name: string;
  genderCategory: GenderCategory;
  status: FixtureStatus;
  eventId: string | null;
  level: TournamentLevel;
  sportId: string;
  venueLevelMappingId: string;
  // Additional properties accessed in components
  sportName?: string;
  eventName?: string;
  matchCount?: number;
  startDate?: string;
  endDate?: string;
  assignedTeams?: string[];
  bracket?: {
    matches: FixtureMatch[];
    winners: string[];
  };
}

export interface FixtureMatch {
  matchId: string;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  roundName: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  dependsOnMatch?: string | null;
  nextMatchId?: string | null;
  nextSlot?: string | null;
}
