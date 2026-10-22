import prisma from '../config/database.js';
import { AttendanceSessionStatus, AttendanceStatus } from '@prisma/client';
import { normalizeDate } from '../utils/dateUtils.js';

export async function getSessionClassStudents(sessionId: string, teacherId?: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      subject: true,
      room: true,
      records: {
        include: { absenceReason: true },
      },
    },
  });

  if (!session) {
    throw new Error('Attendance Session not found');
  }

  if (teacherId && session.teacherId !== teacherId) {
    throw new Error('Forbidden: You do not have permission to access another teacher session');
  }

  // Fetch all active students in the class
  const students = await prisma.student.findMany({
    where: { classId: session.classId, isActive: true },
    orderBy: { lastName: 'asc' },
  });

  const recordMap = new Map(session.records.map((r) => [r.studentId, r]));

  const studentRoster = students.map((s) => {
    const existingRecord = recordMap.get(s.id);
    return {
      studentId: s.id,
      studentNumber: s.studentNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      status: existingRecord ? existingRecord.status : AttendanceStatus.PRESENT,
      absenceReasonId: existingRecord?.absenceReasonId || null,
      absenceReason: existingRecord?.absenceReason || null,
      remarks: existingRecord?.remarks || null,
    };
  });

  return {
    session: {
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      submittedAt: session.submittedAt,
      class: session.class,
      subject: session.subject,
      room: session.room,
    },
    students: studentRoster,
  };
}

export async function initializeOrGetAttendanceSession(
  timetableEntryId: string,
  dateInput: Date | string,
  teacherId: string
) {
  const dateObj = normalizeDate(dateInput);

  const entry = await prisma.timetableEntry.findUnique({
    where: { id: timetableEntryId },
    include: { class: true, subject: true, room: true },
  });

  if (!entry) {
    throw new Error('Timetable entry not found');
  }

  if (entry.teacherId !== teacherId) {
    throw new Error('Forbidden: You are not assigned to conduct this scheduled session');
  }

  // Check if session already exists for this entry and date
  let session = await prisma.attendanceSession.findUnique({
    where: {
      timetableEntryId_date: {
        timetableEntryId,
        date: dateObj,
      },
    },
  });

  if (!session) {
    session = await prisma.attendanceSession.create({
      data: {
        timetableEntryId: entry.id,
        date: dateObj,
        teacherId: entry.teacherId,
        classId: entry.classId,
        subjectId: entry.subjectId,
        roomId: entry.roomId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: AttendanceSessionStatus.OPEN,
      },
    });
  }

  return session;
}

export async function submitAttendanceRecords(
  sessionId: string,
  teacherId: string,
  records: {
    studentId: string;
    status: AttendanceStatus;
    absenceReasonId?: string | null;
    remarks?: string | null;
  }[]
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });

  if (!session) {
    throw new Error('Attendance session not found');
  }

  if (session.teacherId !== teacherId) {
    throw new Error('Forbidden: You cannot record attendance for another teacher session');
  }

  // Fetch valid student IDs in the target class
  const classStudents = await prisma.student.findMany({
    where: { classId: session.classId },
    select: { id: true },
  });

  const validStudentIds = new Set(classStudents.map((s) => s.id));

  // Validate that all submitted student IDs belong to this session's class
  for (const rec of records) {
    if (!validStudentIds.has(rec.studentId)) {
      throw new Error(`Student ${rec.studentId} does not belong to class ${session.class.name}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    // Save/update attendance records
    for (const rec of records) {
      const sanitizedReasonId =
        rec.status === AttendanceStatus.ABSENT && rec.absenceReasonId && rec.absenceReasonId.trim() !== ''
          ? rec.absenceReasonId
          : null;

      await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: rec.studentId,
          },
        },
        create: {
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          absenceReasonId: sanitizedReasonId,
          remarks: rec.remarks || null,
        },
        update: {
          status: rec.status,
          absenceReasonId: sanitizedReasonId,
          remarks: rec.remarks || null,
          recordedAt: new Date(),
        },
      });
    }

    // Mark session status as SUBMITTED
    const updatedSession = await tx.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: AttendanceSessionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        records: true,
      },
    });

    return updatedSession;
  });
}

export async function getAttendanceHistory(filters?: {
  classId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: any = {};

  if (filters?.classId) where.classId = filters.classId;
  if (filters?.teacherId) where.teacherId = filters.teacherId;

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = normalizeDate(filters.startDate);
    if (filters.endDate) where.date.lte = normalizeDate(filters.endDate);
  }

  return prisma.attendanceSession.findMany({
    where,
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
    orderBy: { date: 'desc' },
  });
}
