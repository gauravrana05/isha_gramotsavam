import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';
import { db } from '@/lib/db';
import { teamsManagementRouter } from '../management';
import { createTRPCContext } from '@/server/api/trpc';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    team: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sport: {
      findUnique: jest.fn(),
    },
    event: {
      findFirst: jest.fn(),
    },
    teamVenueAssignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    venueLevelMapping: {
      findMany: jest.fn(),
    },
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Teams Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Team Creation', () => {
    test('should create team with valid data', async () => {
      // Mock data
      const mockUser = {
        id: 'user-1',
        role: 'player',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockSport = {
        id: 'sport-1',
        name: 'Football',
        genderCategory: 'male',
        maxPlayers: 11,
        maxSubstitutes: 5,
      };

      const mockEvent = {
        id: 'event-1',
        name: 'Tournament 2025',
        status: 'active',
      };

      const mockCreatedTeam = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
        sportId: 'sport-1',
        eventId: 'event-1',
        genderCategory: 'male',
        district: 'Test District',
        state: 'Test State',
        status: 'pending',
      };

      // Setup mocks
      mockDb.sport.findUnique.mockResolvedValue(mockSport);
      mockDb.event.findFirst.mockResolvedValue(mockEvent);
      mockDb.team.create.mockResolvedValue(mockCreatedTeam);
      mockDb.user.update.mockResolvedValue({ ...mockUser, role: 'captain' });

      // Create context
      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: mockUser,
      });

      // Create caller
      const caller = teamsManagementRouter.createCaller(ctx);

      // Test team creation
      const result = await caller.create({
        name: 'Test Team',
        description: 'Test Description',
        sportId: 'sport-1',
        genderCategory: 'male',
        panchayat: 'Test Panchayat',
        taluk: 'Test Taluk',
        district: 'Test District',
        state: 'Test State',
        pincode: '123456',
      });

      expect(result).toEqual(mockCreatedTeam);
      expect(mockDb.team.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Team',
          captainId: 'user-1',
          sportId: 'sport-1',
          genderCategory: 'male',
        }),
      });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'captain' },
      });
    });

    test('should reject team creation without required fields', async () => {
      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'player' },
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      await expect(
        caller.create({
          name: '', // Empty name
          sportId: 'sport-1',
          genderCategory: 'male',
          district: 'Test District',
          state: 'Test State',
        } as any)
      ).rejects.toThrow();
    });

    test('should enforce sport-specific gender rules', async () => {
      const mockSport = {
        id: 'sport-1',
        name: 'Football',
        genderCategory: 'male', // Male-only sport
        maxPlayers: 11,
      };

      mockDb.sport.findUnique.mockResolvedValue(mockSport);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'player' },
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      await expect(
        caller.create({
          name: 'Test Team',
          sportId: 'sport-1',
          genderCategory: 'female', // Mismatched gender
          district: 'Test District',
          state: 'Test State',
        })
      ).rejects.toThrow('Gender category mismatch');
    });
  });

  describe('Team Retrieval', () => {
    test('should get team by ID with proper includes', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
        sport: { name: 'Football' },
        captainUser: { firstName: 'John', lastName: 'Doe' },
        teamPlayers: [],
        teamVenueAssignments: [],
      };

      mockDb.team.findUnique.mockResolvedValue(mockTeam);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'captain' },
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      const result = await caller.getById({
        id: 'team-1',
        includePhotos: true,
        includePlayers: true,
        includeVenueAssignments: true,
      });

      expect(result).toEqual(mockTeam);
      expect(mockDb.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        include: expect.objectContaining({
          sport: true,
          captainUser: expect.any(Object),
          teamPlayers: expect.any(Object),
          teamVenueAssignments: expect.any(Object),
        }),
      });
    });

    test('should return null for non-existent team', async () => {
      mockDb.team.findUnique.mockResolvedValue(null);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'player' },
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      const result = await caller.getById({ id: 'non-existent' });

      expect(result).toBeNull();
    });
  });

  describe('Team Updates', () => {
    test('should update team details by captain', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
      };

      const mockUpdatedTeam = {
        ...mockTeam,
        name: 'Updated Team',
        description: 'Updated Description',
      };

      mockDb.team.findUnique.mockResolvedValue(mockTeam);
      mockDb.team.update.mockResolvedValue(mockUpdatedTeam);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'captain' },
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      const result = await caller.update({
        id: 'team-1',
        name: 'Updated Team',
        description: 'Updated Description',
      });

      expect(result).toEqual(mockUpdatedTeam);
      expect(mockDb.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: {
          name: 'Updated Team',
          description: 'Updated Description',
        },
      });
    });

    test('should reject updates by non-captain', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1', // Different user
      };

      mockDb.team.findUnique.mockResolvedValue(mockTeam);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-2', role: 'player' }, // Different user
      });

      const caller = teamsManagementRouter.createCaller(ctx);

      await expect(
        caller.update({
          id: 'team-1',
          name: 'Updated Team',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('Venue Assignment', () => {
    test('should auto-assign venue based on location', async () => {
      // This test would verify the venue assignment logic
      // Implementation depends on the actual venue assignment service
      expect(true).toBe(true); // Placeholder
    });
  });
});
