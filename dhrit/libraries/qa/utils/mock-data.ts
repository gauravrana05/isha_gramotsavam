export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

export const mockAuthResponse = {
  user: mockUser,
  token: 'mock-jwt-token',
};

export const mockUsers = [
  mockUser,
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    avatar: 'https://example.com/admin-avatar.jpg',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

export const mockApiResponse = {
  success: true,
  data: mockUser,
  message: 'Operation successful',
};

export const mockPaginatedResponse = {
  items: mockUsers,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    pages: 1,
  },
};

export const mockFormData = {
  login: {
    email: 'test@example.com',
    password: 'password123',
  },
  register: {
    email: 'newuser@example.com',
    password: 'password123',
    name: 'New User',
  },
  profile: {
    name: 'Updated Name',
    avatar: 'https://example.com/new-avatar.jpg',
  },
};

export const mockApiErrors = {
  validation: {
    code: 'BAD_REQUEST',
    message: 'Validation failed',
    errors: [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password must be at least 8 characters' },
    ],
  },
  unauthorized: {
    code: 'UNAUTHORIZED',
    message: 'Invalid credentials',
  },
  forbidden: {
    code: 'FORBIDDEN',
    message: 'Insufficient permissions',
  },
  notFound: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
  },
  serverError: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  },
};

export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
