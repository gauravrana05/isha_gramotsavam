import { describe, test, expect, beforeEach } from '@jest/globals';
import { db } from '@/lib/db';
import { volunteersVerificationRouter } from '../verification';
import { createTRPCContext } from '@/server/api/trpc';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    teamPlayer: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    volunteerAssignment: {
      findFirst: jest.fn(),
    },
    playerVerification: {
      create: jest.fn(),
    },
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Pending Verifications', () => {
    test('should get pending verifications for volunteer', async () => {
      const mockVolunteerAssignment = {
        id: 'assignment-1',
        venueLevelMapping: {
          venue: { id: 'venue-1', name: 'Test Venue' },
        },
      };

      const mockPendingPlayers = [
        {
          id: 'player-1',
          user: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '1234567890',
          },
          team: {
            name: 'Test Team',
            sport: { name: 'Football' },
          },
          verificationStatus: 'pending',
          documentUrl: 'https://example.com/doc.pdf',
        },
      ];

      mockDb.volunteerAssignment.findFirst.mockResolvedValue(mockVolunteerAssignment);
      mockDb.teamPlayer.findMany.mockResolvedValue(mockPendingPlayers);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'verification_volunteer' },
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      const result = await caller.getPendingVerifications({
        eventId: 'event-1',
      });

      expect(result).toEqual(mockPendingPlayers);
      expect(mockDb.teamPlayer.findMany).toHaveBeenCalledWith({
        where: {
          verificationStatus: 'pending',
          team: {
            teamVenueAssignments: {
              some: {
                eventId: 'event-1',
                OR: expect.any(Array),
              },
            },
          },
        },
        include: expect.any(Object),
      });
    });

    test('should enforce volunteer role permissions', async () => {
      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'user-1', role: 'player' }, // Wrong role
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      await expect(
        caller.getPendingVerifications({ eventId: 'event-1' })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('Player Verification', () => {
    test('should approve player with valid documents', async () => {
      const mockPlayer = {
        id: 'player-1',
        teamId: 'team-1',
        verificationStatus: 'pending',
        team: {
          id: 'team-1',
          teamPlayers: [
            { verificationStatus: 'approved' },
            { verificationStatus: 'pending' }, // This one
          ],
        },
      };

      const mockUpdatedPlayer = {
        ...mockPlayer,
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        verifiedBy: 'volunteer-1',
      };

      mockDb.teamPlayer.findUnique = jest.fn().mockResolvedValue(mockPlayer);
      mockDb.teamPlayer.update.mockResolvedValue(mockUpdatedPlayer);
      mockDb.playerVerification.create.mockResolvedValue({
        id: 'verification-1',
        playerId: 'player-1',
        status: 'approved',
        verifiedBy: 'volunteer-1',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'verification_volunteer' },
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      const result = await caller.verifyPlayer({
        playerId: 'player-1',
        status: 'approved',
        comments: 'Documents verified successfully',
      });

      expect(result.verificationStatus).toBe('approved');
      expect(mockDb.teamPlayer.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: {
          verificationStatus: 'approved',
          verifiedAt: expect.any(Date),
          verifiedBy: 'volunteer-1',
        },
      });
      expect(mockDb.playerVerification.create).toHaveBeenCalled();
    });

    test('should reject player with invalid documents', async () => {
      const mockPlayer = {
        id: 'player-1',
        teamId: 'team-1',
        verificationStatus: 'pending',
      };

      const mockRejectedPlayer = {
        ...mockPlayer,
        verificationStatus: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: 'volunteer-1',
      };

      mockDb.teamPlayer.findUnique = jest.fn().mockResolvedValue(mockPlayer);
      mockDb.teamPlayer.update.mockResolvedValue(mockRejectedPlayer);

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'verification_volunteer' },
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      const result = await caller.verifyPlayer({
        playerId: 'player-1',
        status: 'rejected',
        comments: 'Invalid documents provided',
      });

      expect(result.verificationStatus).toBe('rejected');
      expect(mockDb.playerVerification.create).toHaveBeenCalledWith({
        data: {
          playerId: 'player-1',
          status: 'rejected',
          comments: 'Invalid documents provided',
          verifiedBy: 'volunteer-1',
        },
      });
    });

    test('should update team status when all players verified', async () => {
      const mockPlayer = {
        id: 'player-1',
        teamId: 'team-1',
        verificationStatus: 'pending',
        team: {
          id: 'team-1',
          status: 'pending_verification',
          teamPlayers: [
            { verificationStatus: 'approved' },
            { verificationStatus: 'approved' },
            { verificationStatus: 'pending' }, // This one will be approved
          ],
        },
      };

      mockDb.teamPlayer.findUnique = jest.fn().mockResolvedValue(mockPlayer);
      mockDb.teamPlayer.update.mockResolvedValue({
        ...mockPlayer,
        verificationStatus: 'approved',
      });
      mockDb.team.update.mockResolvedValue({
        id: 'team-1',
        status: 'verified',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'verification_volunteer' },
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      await caller.verifyPlayer({
        playerId: 'player-1',
        status: 'approved',
        comments: 'All players verified',
      });

      // Should update team status to verified
      expect(mockDb.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: { status: 'verified' },
      });
    });
  });

  describe('Audit Trail', () => {
    test('should create audit trail for verification actions', async () => {
      const mockPlayer = {
        id: 'player-1',
        teamId: 'team-1',
        verificationStatus: 'pending',
      };

      mockDb.teamPlayer.findUnique = jest.fn().mockResolvedValue(mockPlayer);
      mockDb.teamPlayer.update.mockResolvedValue({
        ...mockPlayer,
        verificationStatus: 'approved',
      });

      const ctx = await createTRPCContext({
        req: {} as any,
        res: {} as any,
        user: { id: 'volunteer-1', role: 'verification_volunteer' },
      });

      const caller = volunteersVerificationRouter.createCaller(ctx);

      await caller.verifyPlayer({
        playerId: 'player-1',
        status: 'approved',
        comments: 'Documents verified',
      });

      expect(mockDb.playerVerification.create).toHaveBeenCalledWith({
        data: {
          playerId: 'player-1',
          status: 'approved',
          comments: 'Documents verified',
          verifiedBy: 'volunteer-1',
          verifiedAt: expect.any(Date),
        },
      });
    });
  });
});
