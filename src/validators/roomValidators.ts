import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Room name is required'),
    building: z.string().trim().optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
  }),
});

export const updateRoomSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid room ID'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Room name cannot be empty').optional(),
    building: z.string().trim().optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
  }),
});
