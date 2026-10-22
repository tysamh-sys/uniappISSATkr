import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const initializeSessionSchema = z.object({
  body: z.object({
    timetableEntryId: z.string().uuid('Invalid timetable entry ID'),
    date: z.string().min(1, 'Date is required'),
  }),
});

export const recordAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID'),
          status: z.nativeEnum(AttendanceStatus),
          absenceReasonId: z.string().uuid().or(z.literal('')).optional().nullable(),
          remarks: z.string().optional().nullable(),
        })
      )
      .min(1, 'At least one student attendance record is required'),
  }),
});
