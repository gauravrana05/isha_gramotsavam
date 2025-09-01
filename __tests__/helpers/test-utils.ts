import { PrismaClient } from '@prisma/client'

export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  team: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  teamPlayer: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  sport: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'player',
  profileComplete: true,
  ...overrides,
})

export const createMockTeam = (overrides = {}) => ({
  id: 'team-1',
  name: 'Test Team',
  status: 'draft',
  captainId: 'user-1',
  sportId: 'sport-1',
  genderCategory: 'men',
  ...overrides,
})

export const createMockContext = (user = createMockUser()) => ({
  db: mockPrisma,
  user,
})
