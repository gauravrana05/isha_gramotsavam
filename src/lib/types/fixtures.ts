export interface ProcessedMatch {
  id: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  matchId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  round: number;
  position: number;
}

export interface FixtureData {
  id: string;
  name: string;
  status: string;
  matches: ProcessedMatch[];
  teams: any[];
}

export interface BracketData {
  rounds: ProcessedMatch[][];
  teams: any[];
}
