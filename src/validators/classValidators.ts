import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Class name is required'),
    code: z.string().trim().min(1, 'Class code is required'),
  }),
});

export const updateClassSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid class ID'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Class name cannot be empty').optional(),
    code: z.string().trim().min(1, 'Class code cannot be empty').optional(),
  }),
});
