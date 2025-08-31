import { BaseEntity } from '../shared/common';
import { GenderCategory } from '../shared/enums';

// Sports API response types
export interface SportData extends BaseEntity {
  name: string;
  description: string | null;
  category: 'team' | 'individual';
  mainPlayersCount: number;
  maxSubstitutes: number;
  isActive: boolean;
  genderCategories: GenderCategory[];
  maxPlayers?: number;
  minPlayers?: number;
}
