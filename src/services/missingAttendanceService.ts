import prisma from '../config/database.js';
import { AttendanceSessionStatus, TimetableVersionStatus } from '@prisma/client';
import { getDayOfWeekFromDate, timeToMinutes, formatDateToYYYYMMDD, normalizeDate } from '../utils/dateUtils.js';

export async function getMissingAttendanceSessions(dateInput?: Date | string) {
  const targetDate = normalizeDate(dateInput);

  const dayOfWeek = getDayOfWeekFromDate(targetDate);

  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  if (!activeVersion) {
    return [];
  }

  // Find all scheduled entries for today
  const entries = await prisma.timetableEntry.findMany({
    where: {
      timetableVersionId: activeVersion.id,
      dayOfWeek,
    },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true } },
    },
  });

  // Find all existing attendance sessions for today
  const existingSessions = await prisma.attendanceSession.findMany({
    where: { date: targetDate },
  });

  const submittedSessionEntryIds = new Set(
    existingSessions
      .filter((s) => s.status === AttendanceSessionStatus.SUBMITTED)
      .map((s) => s.timetableEntryId)
  );

  const missing = entries
    .filter((entry) => !submittedSessionEntryIds.has(entry.id))
    .map((entry) => ({
      timetableEntryId: entry.id,
      date: formatDateToYYYYMMDD(targetDate),
      dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      teacher: entry.teacher,
      class: entry.class,
      subject: entry.subject,
      room: entry.room,
      status: 'ATTENDANCE_NOT_RECORDED' as const,
    }));

  return missing;
}
