import prisma from '../config/database.js';
import { AttendanceSessionStatus, TimetableVersionStatus } from '@prisma/client';
import { getDayOfWeekFromDate, formatDateToYYYYMMDD, normalizeDate } from '../utils/dateUtils.js';

export async function getTeacherWeeklySchedule(teacherId: string) {
  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  if (!activeVersion) {
    return [];
  }

  return prisma.timetableEntry.findMany({
    where: {
      teacherId,
      timetableVersionId: activeVersion.id,
    },
    include: {
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true, building: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getTeacherTodaySchedule(teacherId: string, dateInput?: Date | string) {
  const targetDate = normalizeDate(dateInput);

  const dayOfWeek = getDayOfWeekFromDate(targetDate);
  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  if (!activeVersion) {
    return {
      date: formatDateToYYYYMMDD(targetDate),
      dayOfWeek,
      classes: [],
    };
  }

  // Get scheduled timetable entries for teacher today
  const entries = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      timetableVersionId: activeVersion.id,
      dayOfWeek,
    },
    include: {
      class: { select: { id: true, name: true, code: true, _count: { select: { students: true } } } },
      subject: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true, building: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  // Get existing attendance sessions for today
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      teacherId,
      date: targetDate,
    },
  });

  const sessionMap = new Map(sessions.map((s) => [s.timetableEntryId, s]));

  const scheduledClasses = entries.map((entry) => {
    const session = entry.id ? sessionMap.get(entry.id) : undefined;
    return {
      timetableEntryId: entry.id,
      sessionId: session?.id || null,
      startTime: entry.startTime,
      endTime: entry.endTime,
      class: entry.class,
      subject: entry.subject,
      room: entry.room,
      totalStudents: entry.class._count.students,
      attendanceStatus: session ? session.status : ('NOT_RECORDED' as const),
      submittedAt: session?.submittedAt || null,
    };
  });

  return {
    date: formatDateToYYYYMMDD(targetDate),
    dayOfWeek,
    classes: scheduledClasses,
  };
}
