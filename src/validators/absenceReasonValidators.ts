import { z } from 'zod';

export const createAbsenceReasonSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Absence reason name is required'),
    description: z.string().trim().optional().nullable(),
    requiresProof: z.boolean().optional(),
  }),
});

export const updateAbsenceReasonSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid absence reason ID'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Absence reason name cannot be empty').optional(),
    description: z.string().trim().optional().nullable(),
    requiresProof: z.boolean().optional(),
  }),
});
