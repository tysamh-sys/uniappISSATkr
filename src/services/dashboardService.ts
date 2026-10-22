import prisma from '../config/database.js';
import { AttendanceSessionStatus, AttendanceStatus, TimetableVersionStatus } from '@prisma/client';
import { getDayOfWeekFromDate, normalizeDate } from '../utils/dateUtils.js';

export async function getAdminDashboardStats() {
  const today = normalizeDate();

  const dayOfWeek = getDayOfWeekFromDate(today);

  // 1. Total active students
  const totalStudents = await prisma.student.count({ where: { isActive: true } });

  // 2. Total active teachers
  const totalTeachers = await prisma.teacher.count();

  // 3. Active Timetable Version
  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  // 4. Expected sessions today
  let todaySessionsCount = 0;
  if (activeVersion) {
    todaySessionsCount = await prisma.timetableEntry.count({
      where: {
        timetableVersionId: activeVersion.id,
        dayOfWeek,
      },
    });
  }

  // 5. Recorded sessions today
  const recordedSessionsCount = await prisma.attendanceSession.count({
    where: {
      date: today,
      status: AttendanceSessionStatus.SUBMITTED,
    },
  });

  // 6. Not recorded sessions today
  const notRecordedSessionsCount = Math.max(0, todaySessionsCount - recordedSessionsCount);

  // 7. Today student absences count
  const todayAbsencesCount = await prisma.attendanceRecord.count({
    where: {
      session: { date: today },
      status: AttendanceStatus.ABSENT,
    },
  });

  return {
    totalStudents,
    totalTeachers,
    todaySessions: todaySessionsCount,
    recordedSessions: recordedSessionsCount,
    notRecordedSessions: notRecordedSessionsCount,
    todayAbsences: todayAbsencesCount,
  };
}
