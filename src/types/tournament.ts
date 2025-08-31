import type { 
  Fixture, 
  Match, 
  Team, 
  Sport, 
  VenueLevelMapping, 
  Venue,
  FixtureStatus,
  MatchStatus,
  GenderCategory,
  TournamentLevel 
} from '@prisma/client';

export interface FixtureWithDetails extends Fixture {
  sport: Sport;
  venueLevelMapping: VenueLevelMapping & {
    venue: Venue;
  };
  matches: MatchWithTeams[];
}

export interface MatchWithTeams extends Match {
  team1?: Team | null;
  team2?: Team | null;
  winner?: Team | null;
  fixture: {
    name: string;
    sport: { name: string };
  };
}

export interface BracketMatch {
  id: string;
  matchNumber: number;
  roundName: string;
  team1?: { name: string; tournamentNumber?: number | null } | null;
  team2?: { name: string; tournamentNumber?: number | null } | null;
  winner?: { name: string } | null;
  team1Score?: number | null;
  team2Score?: number | null;
  status: MatchStatus;
  scheduledTime?: Date | null;
  actualStartTime?: Date | null;
  scoreDetails?: string | null;
}

export interface TournamentStats {
  totalTeams: number;
  checkedInTeams: number;
  activeFixtures: number;
  completedFixtures: number;
  todayMatches: number;
  completedMatches: number;
}

export interface TeamAssignment {
  teamId: string;
  teamName: string;
  captainName: string;
  number: number;
}

export interface FixtureCreationData {
  name: string;
  sportId: string;
  genderCategory: GenderCategory;
  level: TournamentLevel;
  maxTeams: number;
  description?: string;
}

export interface MatchResult {
  team1Score: number;
  team2Score: number;
  winnerId: string;
  scoreDetails?: string;
}
