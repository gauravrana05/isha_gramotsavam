import { TRPCError } from '@trpc/server';

export type ErrorCode = 
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly field?: string;
  public readonly details?: Record<string, any>;

  constructor(error: ErrorDetails) {
    super(error.message);
    this.code = error.code;
    this.field = error.field;
    this.details = error.details;
    this.name = 'AppError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: this.code,
      message: this.message,
    });
  }
}

export const ErrorMessages = {
  // Authentication & Authorization
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  PROFILE_INCOMPLETE: 'Please complete your profile before continuing',
  
  // Team Management
  TEAM_NOT_FOUND: 'Team not found',
  TEAM_NOT_CAPTAIN: 'Only team captain can perform this action',
  TEAM_ALREADY_SUBMITTED: 'Team has already been submitted for verification',
  TEAM_CANNOT_MODIFY: 'Team cannot be modified after submission',
  TEAM_INSUFFICIENT_PLAYERS: (min: number) => `Team must have at least ${min} players`,
  TEAM_MAX_PLAYERS_REACHED: (max: number) => `Maximum ${max} players allowed`,
  
  // Player Management
  PLAYER_NOT_FOUND: 'Player not found',
  PLAYER_ALREADY_IN_TEAM: 'Player is already in this team',
  PLAYER_IN_OTHER_TEAM: (teamName: string) => `Player is already registered in team "${teamName}" for this sport`,
  PLAYER_AGE_TOO_YOUNG: (minAge: number) => `Player must be at least ${minAge} years old`,
  PLAYER_AGE_TOO_OLD: (maxAge: number) => `Player must be at most ${maxAge} years old`,
  PLAYER_WRONG_PANCHAYAT: 'All players must be from the same panchayat as the captain',
  
  // Validation
  INVALID_INPUT: 'Invalid input provided',
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `${field} format is invalid`,
  
  // System
  DATABASE_ERROR: 'A database error occurred',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

export function createError(code: ErrorCode, message: string, field?: string, details?: Record<string, any>): AppError {
  return new AppError({ code, message, field, details });
}

export function handleDatabaseError(error: any): AppError {
  console.error('Database error:', error);
  
  // Handle specific Prisma errors
  if (error.code === 'P2002') {
    return createError('CONFLICT', 'A record with this information already exists');
  }
  
  if (error.code === 'P2025') {
    return createError('NOT_FOUND', 'Record not found');
  }
  
  return createError('INTERNAL_SERVER_ERROR', ErrorMessages.DATABASE_ERROR);
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}
