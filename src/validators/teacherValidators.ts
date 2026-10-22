import { z } from 'zod';

export const createTeacherSchema = z.object({
  body: z.object({
    teacherNumber: z.string().min(1, 'Teacher number is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Initial password must be at least 6 characters'),
    phone: z.string().optional().nullable(),
  }),
});

export const updateTeacherSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher ID'),
  }),
  body: z.object({
    teacherNumber: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
  }),
});
