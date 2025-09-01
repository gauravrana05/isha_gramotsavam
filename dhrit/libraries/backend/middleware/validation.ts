import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          cause: error.errors,
        });
      }
      throw error;
    }
  };
}

export const commonSchemas = {
  id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  url: z.string().url(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
  }),
  search: z.object({
    query: z.string().min(1).max(100),
    filters: z.record(z.any()).optional(),
  }),
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
};

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateFileUpload(file: any) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (!file) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No file provided'
    });
  }
  
  if (file.size > maxSize) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'File too large'
    });
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid file type'
    });
  }
  
  return true;
}
