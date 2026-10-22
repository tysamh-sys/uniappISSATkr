import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Subject name is required'),
    code: z.string().trim().min(1, 'Subject code is required'),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subject ID'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Subject name cannot be empty').optional(),
    code: z.string().trim().min(1, 'Subject code cannot be empty').optional(),
  }),
});
