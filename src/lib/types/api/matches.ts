import { BaseEntity } from '../shared/common';
import { GenderCategory, MatchStatus } from '../shared/enums';

// Match API response types
export interface MatchData extends BaseEntity {
  genderCategory: GenderCategory;
  status: MatchStatus;
  eventId: string | null;
  fixtureId: string;
  roundName: string;
  matchNumber: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  team1Score: number | null;
  team2Score: number | null;
  scoreDetails: string | null;
  resultEnteredBy: string | null;
  resultEnteredAt: string | null;
  // Additional properties for display
  team1Name?: string;
  team2Name?: string;
}
