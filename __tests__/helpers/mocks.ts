// Mock tRPC
export const mockTRPCContext = {
  user: {
    id: 'test-user-1',
    role: 'player',
    firstName: 'Test',
    lastName: 'User',
  },
  req: {} as any,
  res: {} as any,
};

// Mock Prisma DB
export const mockDb = {
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
  teamPlayer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  volunteerAssignment: {
    findFirst: jest.fn(),
  },
  fixture: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  match: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Mock tRPC router
export const createMockRouter = (procedures: any) => ({
  createCaller: (ctx: any) => procedures,
});
