import { describe, test, expect, beforeEach } from '@jest/globals';
import { db } from '@/lib/db';
import { volunteersFixtureRouter } from '../fixture';
import { createTRPCContext } from '@/server/api/trpc';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    fixture: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    volunteerAssignment: {
      findFirst: jest.fn(),
    },
    fixtureTeam: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    tournamentBracket: {
      update: jest.fn(),
    },
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Fixture Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Venue Fixtures', () => {
    test('should get venue fixtures for assigned volunteer', async () => {
      const mockVolunteerAssignment = {
        id: 'assignment-1',
        venueLevelMapping: {
          venue: { id: 'venue-1', name: 'Test Venue' },
        },
      };

      const mockFixtures = [
        {
          id: 'fixture-1',
          name: 'Quarter Final 1',
          status: 'scheduled',
          scheduledAt: new Date(),
          venueLevelMapping: {
            venue: { name: 'Test Venue' },
          },
          matches: [
            {
              id: 'match-1',
              team1: { name: 'Team A' },
              team2: { name: 'Team B' },
              status: 'scheduled',
            },
          ],
        },
      ];

      mockDb.volunteerAssignment.findFirst.mockResolvedValue(mockVolunteerAssignment);
      mockDb.fixture.findMany.mockResolvedValue(mockFixtures);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      const result = await caller.getVenueFixtures({
        eventId: 'event-1',
        date: new Date(),
      });

      expect(result).toEqual(mockFixtures);
      expect(mockDb.fixture.findMany).toHaveBeenCalledWith({
        where: {
          eventId: 'event-1',
          venueLevelMapping: {
            venueId: 'venue-1',
          },
          scheduledAt: expect.any(Object),
        },
        include: expect.any(Object),
      });
    });

    test('should enforce venue assignment permissions', async () => {
      mockDb.volunteerAssignment.findFirst.mockResolvedValue(null);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      await expect(
        caller.getVenueFixtures({ eventId: 'event-1' })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('Match Score Updates', () => {
    test('should update match scores', async () => {
      const mockMatch = {
        id: 'match-1',
        fixtureId: 'fixture-1',
        team1Id: 'team-1',
        team2Id: 'team-2',
        status: 'in_progress',
        fixture: {
          venueLevelMapping: {
            venueId: 'venue-1',
          },
        },
      };

      const mockUpdatedMatch = {
        ...mockMatch,
        team1Score: 2,
        team2Score: 1,
        status: 'completed',
        winnerId: 'team-1',
      };

      mockDb.volunteerAssignment.findFirst.mockResolvedValue({
        venueLevelMapping: { venueId: 'venue-1' },
      });
      mockDb.match.findUnique = jest.fn().mockResolvedValue(mockMatch);
      mockDb.match.update.mockResolvedValue(mockUpdatedMatch);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      const result = await caller.updateMatchScore({
        matchId: 'match-1',
        team1Score: 2,
        team2Score: 1,
        status: 'completed',
      });

      expect(result.team1Score).toBe(2);
      expect(result.team2Score).toBe(1);
      expect(result.status).toBe('completed');
      expect(result.winnerId).toBe('team-1');
    });

    test('should determine winner correctly', async () => {
      const mockMatch = {
        id: 'match-1',
        team1Id: 'team-1',
        team2Id: 'team-2',
        status: 'in_progress',
        fixture: {
          venueLevelMapping: { venueId: 'venue-1' },
        },
      };

      mockDb.volunteerAssignment.findFirst.mockResolvedValue({
        venueLevelMapping: { venueId: 'venue-1' },
      });
      mockDb.match.findUnique = jest.fn().mockResolvedValue(mockMatch);
      mockDb.match.update.mockResolvedValue({
        ...mockMatch,
        team1Score: 1,
        team2Score: 3,
        winnerId: 'team-2',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      await caller.updateMatchScore({
        matchId: 'match-1',
        team1Score: 1,
        team2Score: 3,
        status: 'completed',
      });

      expect(mockDb.match.update).toHaveBeenCalledWith({
        where: { id: 'match-1' },
        data: {
          team1Score: 1,
          team2Score: 3,
          status: 'completed',
          winnerId: 'team-2', // Team 2 should win
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('Tournament Progression', () => {
    test('should progress tournament brackets', async () => {
      const mockFixture = {
        id: 'fixture-1',
        status: 'in_progress',
        matches: [
          { id: 'match-1', status: 'completed', winnerId: 'team-1' },
          { id: 'match-2', status: 'completed', winnerId: 'team-2' },
        ],
      };

      mockDb.fixture.findUnique = jest.fn().mockResolvedValue(mockFixture);
      mockDb.fixture.update.mockResolvedValue({
        ...mockFixture,
        status: 'completed',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      await caller.completeFixture({
        fixtureId: 'fixture-1',
      });

      expect(mockDb.fixture.update).toHaveBeenCalledWith({
        where: { id: 'fixture-1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
    });

    test('should handle match completion workflow', async () => {
      const mockMatch = {
        id: 'match-1',
        fixtureId: 'fixture-1',
        status: 'in_progress',
        fixture: {
          id: 'fixture-1',
          matches: [
            { id: 'match-1', status: 'in_progress' }, // This match
            { id: 'match-2', status: 'completed' },
          ],
          venueLevelMapping: { venueId: 'venue-1' },
        },
      };

      mockDb.volunteerAssignment.findFirst.mockResolvedValue({
        venueLevelMapping: { venueId: 'venue-1' },
      });
      mockDb.match.findUnique = jest.fn().mockResolvedValue(mockMatch);
      mockDb.match.update.mockResolvedValue({
        ...mockMatch,
        status: 'completed',
        winnerId: 'team-1',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      await caller.updateMatchScore({
        matchId: 'match-1',
        team1Score: 2,
        team2Score: 1,
        status: 'completed',
      });

      // Should complete the match
      expect(mockDb.match.update).toHaveBeenCalledWith({
        where: { id: 'match-1' },
        data: expect.objectContaining({
          status: 'completed',
          winnerId: expect.any(String),
        }),
      });
    });
  });

  describe('Team Check-in', () => {
    test('should handle team check-in for fixtures', async () => {
      const mockFixtureTeam = {
        id: 'fixture-team-1',
        fixtureId: 'fixture-1',
        teamId: 'team-1',
        checkedIn: false,
        fixture: {
          venueLevelMapping: { venueId: 'venue-1' },
        },
      };

      mockDb.volunteerAssignment.findFirst.mockResolvedValue({
        venueLevelMapping: { venueId: 'venue-1' },
      });
      mockDb.fixtureTeam.findUnique = jest.fn().mockResolvedValue(mockFixtureTeam);
      mockDb.fixtureTeam.update.mockResolvedValue({
        ...mockFixtureTeam,
        checkedIn: true,
        checkedInAt: new Date(),
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'technical_volunteer' },
      });

      const caller = volunteersFixtureRouter.createCaller(ctx);

      const result = await caller.checkInTeam({
        fixtureId: 'fixture-1',
        teamId: 'team-1',
      });

      expect(result.checkedIn).toBe(true);
      expect(mockDb.fixtureTeam.update).toHaveBeenCalledWith({
        where: { id: 'fixture-team-1' },
        data: {
          checkedIn: true,
          checkedInAt: expect.any(Date),
          checkedInBy: 'volunteer-1',
        },
      });
    });
  });
});
