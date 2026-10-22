import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    studentNumber: z.string().min(1, 'Student number is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email').optional().nullable(),
    classId: z.string().uuid('Invalid class ID'),
    isActive: z.boolean().optional(),
  }),
});

export const updateStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid student ID'),
  }),
  body: z.object({
    studentNumber: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    classId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});
