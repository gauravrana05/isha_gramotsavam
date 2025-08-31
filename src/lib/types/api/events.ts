import { BaseEntity } from '../shared/common';

// Event API response types
export interface EventData extends BaseEntity {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  isActive: boolean;
  createdByUser: {
    firstName: string;
    lastName: string;
  };
  _count: {
    teams: number;
    fixtures: number;
  };
}
