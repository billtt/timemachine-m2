import { z } from 'zod';
import { SLICE_TYPES } from './shared';

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string().min(2).max(50).trim(),
  password: z.string().min(6).max(100)
});

export const registerSchema = z.object({
  username: z.string().min(2).max(50).trim(),
  password: z.string().min(6).max(100),
  email: z.string().email().optional().or(z.literal(''))
});

// Slice validation schemas
export const createSliceSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
  type: z.enum(SLICE_TYPES as [string, ...string[]]).default('other'),
  time: z.string().datetime().optional()
});

export const updateSliceSchema = z.object({
  content: z.string().min(1).max(1000).trim().optional(),
  type: z.enum(SLICE_TYPES as [string, ...string[]]).optional(),
  time: z.string().datetime().optional()
});

// Query validation schemas
export const sliceQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(SLICE_TYPES as [string, ...string[]]).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  search: z.string().max(200).optional()
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  type: z.enum(SLICE_TYPES as [string, ...string[]]).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  useRegex: z.string().transform(val => val === 'true').optional()
});

// Sync validation schema
export const syncSchema = z.object({
  slices: z.array(z.object({
    id: z.string(),
    content: z.string().min(1).max(1000).trim(),
    type: z.enum(SLICE_TYPES as [string, ...string[]]),
    time: z.string().datetime(),
    createdAt: z.string().datetime(),
    synced: z.boolean().default(false),
    tempId: z.string().optional()
  }))
});

// Types
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type CreateSliceData = z.infer<typeof createSliceSchema>;
export type UpdateSliceData = z.infer<typeof updateSliceSchema>;
export type SliceQueryData = z.infer<typeof sliceQuerySchema>;
export type SearchQueryData = z.infer<typeof searchQuerySchema>;
export type SyncData = z.infer<typeof syncSchema>;