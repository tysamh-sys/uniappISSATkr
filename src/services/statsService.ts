import prisma from '../config/database.js';
import { AttendanceStatus, CertificateStatus } from '@prisma/client';
import { formatAbsenceRow } from './absenceService.js';
import { listSessions } from './sessionService.js';
import { getActivities } from './activityService.js';

export function academicYearOf(dateIso: string): number {
  const [y, m] = dateIso.split('-').map(Number);
  return m >= 9 ? y : y - 1;
}

export function monthIndex(dateIso: string): number {
  const m = Number(dateIso.split('-')[1]);
  return (m + 3) % 12; // Sep -> 0 … Aug -> 11
}

export async function listAcademicYears(): Promise<number[]> {
  const sessions = await prisma.attendanceSession.findMany({ select: { date: true } });
  const currentYear = academicYearOf(new Date().toISOString().split('T')[0]);
  const years = new Set<number>([currentYear]);

  sessions.forEach((s) => {
    const dStr = s.date.toISOString().split('T')[0];
    years.add(academicYearOf(dStr));
  });

  return [...years].sort((a, b) => b - a);
}

export async function getAdminStats(yearInput?: number) {
  const todayStr = new Date().toISOString().split('T')[0];
  const academicYear = yearInput || academicYearOf(todayStr);

  const [studentCount, teacherCount, activeTeacherCount, pendingCertificates] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.certificate.count({ where: { status: CertificateStatus.PENDING } }),
  ]);

  // Absences
  const rawRecords = await prisma.attendanceRecord.findMany({
    where: {
      status: { in: [AttendanceStatus.ABSENT, AttendanceStatus.JUSTIFIED] },
    },
    include: {
      student: { include: { class: true } },
      session: { include: { subject: true, teacher: true, class: true } },
      certificate: true,
    },
    orderBy: { recordedAt: 'desc' },
  });

  const allRows = rawRecords.map(formatAbsenceRow);
  const inYear = allRows.filter((r) => academicYearOf(r.session.date) === academicYear);

  const absencesByMonth = Array(12).fill(0) as number[];
  inYear.forEach((r) => {
    absencesByMonth[monthIndex(r.session.date)] += 1;
  });

  const currentMonthPrefix = todayStr.slice(0, 7);
  const absencesThisMonth = allRows.filter((r) => r.session.date.startsWith(currentMonthPrefix)).length;

  const unjustifiedCount = inYear.filter(
    (r) => r.absence.status === 'unjustified' || r.absence.status === 'rejected'
  ).length;

  const unjustifiedRate = inYear.length ? Math.round((unjustifiedCount / inYear.length) * 100) : 0;

  // Flagged students
  const flaggedMap = new Map<string, { student: any; subject: any; count: number }>();
  for (const r of inYear) {
    if (r.absence.status !== 'unjustified' && r.absence.status !== 'rejected') continue;
    const key = `${r.student.id}|${r.subject.id}`;
    const curr = flaggedMap.get(key) || { student: r.student, subject: r.subject, count: 0 };
    curr.count += 1;
    flaggedMap.set(key, curr);
  }
  const flaggedStudents = [...flaggedMap.values()]
    .filter((e) => e.count >= 3)
    .sort((a, b) => b.count - a.count);

  const rawActivities = await getActivities(undefined, 8);
  const recentActivity = rawActivities.map((a) => ({
    id: a.id,
    kind: a.kind as any,
    message: a.message,
    actorUserId: a.actorUserId,
    subjectUserIds: a.subjectUserIds,
    at: a.createdAt.toISOString(),
  }));

  return {
    studentCount,
    teacherCount,
    activeTeacherCount,
    pendingCertificates,
    absencesThisMonth,
    unjustifiedRate,
    absencesByMonth,
    recentAbsences: allRows.slice(0, 6),
    recentActivity,
    flaggedStudents,
  };
}

export async function getTeacherStats(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      timetableEntries: { include: { subject: true } },
    },
  });

  if (!teacher) throw new Error('Enseignant introuvable.');

  const todayStr = new Date().toISOString().split('T')[0];
  const year = academicYearOf(todayStr);

  const rawRecords = await prisma.attendanceRecord.findMany({
    where: {
      session: { teacherId },
      status: { in: [AttendanceStatus.ABSENT, AttendanceStatus.JUSTIFIED] },
    },
    include: {
      student: { include: { class: true } },
      session: { include: { subject: true, teacher: true, class: true } },
      certificate: true,
    },
    orderBy: { recordedAt: 'desc' },
  });

  const rows = rawRecords.map(formatAbsenceRow).filter((r) => academicYearOf(r.session.date) === year);

  const subjectMap = new Map<string, any>();
  teacher.timetableEntries.forEach((e) => {
    if (e.subject) subjectMap.set(e.subject.id, { id: e.subject.id, name: e.subject.name, code: e.subject.code });
  });
  const subjects = [...subjectMap.values()];

  const sessionCount = await prisma.attendanceSession.count({
    where: { teacherId },
  });

  const pendingCount = rows.filter((r) => r.absence.status === 'pending').length;

  // Flagged students
  const flaggedMap = new Map<string, { student: any; subject: any; count: number }>();
  for (const r of rows) {
    if (r.absence.status !== 'unjustified' && r.absence.status !== 'rejected') continue;
    const key = `${r.student.id}|${r.subject.id}`;
    const curr = flaggedMap.get(key) || { student: r.student, subject: r.subject, count: 0 };
    curr.count += 1;
    flaggedMap.set(key, curr);
  }
  const flaggedStudents = [...flaggedMap.values()]
    .filter((e) => e.count >= 3)
    .sort((a, b) => b.count - a.count);

  const absencesBySubject = subjects.map((sub) => ({
    subject: sub,
    count: rows.filter((r) => r.subject.id === sub.id).length,
  }));

  const recentSessionsData = await listSessions({ teacherId, pageSize: 5 });

  return {
    subjects,
    sessionCount,
    absenceCount: rows.length,
    pendingCount,
    recentSessions: recentSessionsData.items,
    flaggedStudents,
    absencesBySubject,
  };
}

export async function getStudentStats(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error('Étudiant introuvable.');

  const todayStr = new Date().toISOString().split('T')[0];
  const year = academicYearOf(todayStr);

  const rawRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      status: { in: [AttendanceStatus.ABSENT, AttendanceStatus.JUSTIFIED] },
    },
    include: {
      student: { include: { class: true } },
      session: { include: { subject: true, teacher: true, class: true } },
      certificate: true,
    },
    orderBy: { recordedAt: 'desc' },
  });

  const rows = rawRecords.map(formatAbsenceRow).filter((r) => academicYearOf(r.session.date) === year);

  const count = (status: string) => rows.filter((r) => r.absence.status === status).length;

  const subjectMap = new Map<string, any>();
  rows.forEach((r) => subjectMap.set(r.subject.id, r.subject));

  const bySubject = [...subjectMap.values()]
    .map((sub) => {
      const mine = rows.filter((r) => r.subject.id === sub.id);
      const unjustified = mine.filter((r) => r.absence.status === 'unjustified' || r.absence.status === 'rejected').length;
      return {
        subject: sub,
        total: mine.length,
        unjustified,
        flagged: unjustified >= 3,
      };
    })
    .sort((a, b) => b.unjustified - a.unjustified || b.total - a.total);

  const rawActivities = await getActivities(student.userId || student.id, 6);
  const recentActivity = rawActivities.map((a) => ({
    id: a.id,
    kind: a.kind as any,
    message: a.message,
    actorUserId: a.actorUserId,
    subjectUserIds: a.subjectUserIds,
    at: a.createdAt.toISOString(),
  }));

  return {
    total: rows.length,
    unjustified: count('unjustified'),
    pending: count('pending'),
    justified: count('justified'),
    rejected: count('rejected'),
    bySubject,
    recent: rows.slice(0, 5),
    recentActivity,
  };
}
