import { z } from 'zod';
import { DayOfWeek, TimetableVersionStatus } from '@prisma/client';

export const createTimetableVersionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    validFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    validUntil: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    status: z.nativeEnum(TimetableVersionStatus).optional(),
  }),
});

export const createTimetableEntrySchema = z.object({
  body: z.object({
    timetableVersionId: z.string().uuid('Invalid timetable version ID'),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    teacherId: z.string().uuid('Invalid teacher ID'),
    classId: z.string().uuid('Invalid class ID'),
    subjectId: z.string().uuid('Invalid subject ID'),
    roomId: z.string().uuid('Invalid room ID'),
  }),
});

export const updateTimetableEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid entry ID'),
  }),
  body: z.object({
    dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    teacherId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    roomId: z.string().uuid().optional(),
  }),
});

export const confirmTimetableImportSchema = z.object({
  body: z.object({
    timetableVersionId: z.string().uuid('Invalid timetable version ID'),
    entries: z
      .array(
        z.object({
          dayOfWeek: z.nativeEnum(DayOfWeek),
          startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
          endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
          teacherId: z.string().uuid('Invalid teacher ID'),
          classId: z.string().uuid('Invalid class ID'),
          subjectId: z.string().uuid('Invalid subject ID'),
          roomId: z.string().uuid('Invalid room ID'),
        })
      )
      .min(1, 'At least one timetable entry is required for import'),
  }),
});
