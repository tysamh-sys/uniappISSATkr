import prisma from '../config/database.js';
import { AttendanceStatus } from '@prisma/client';
import { formatStudent } from './studentService.js';
import { formatSession } from './sessionService.js';
import { logActivity } from './activityService.js';

export function formatAbsenceStatus(record: any): 'unjustified' | 'pending' | 'justified' | 'rejected' {
  if (record.status === AttendanceStatus.JUSTIFIED) return 'justified';
  if (record.certificate?.status === 'PENDING') return 'pending';
  if (record.certificate?.status === 'REJECTED') return 'rejected';
  if (record.note?.toLowerCase().includes('refus')) return 'rejected';
  return 'unjustified';
}

export function formatAbsenceRow(r: any) {
  const status = formatAbsenceStatus(r);
  const absence = {
    id: r.id,
    studentId: r.studentId,
    sessionId: r.sessionId,
    status,
    certificateId: r.certificateId || undefined,
    note: r.note || r.remarks || undefined,
    createdAt: r.recordedAt.toISOString(),
    updatedAt: r.recordedAt.toISOString(),
  };

  const student = formatStudent(r.student);
  const session = formatSession(r.session);
  const subject = {
    id: r.session.subject.id,
    name: r.session.subject.name,
    code: r.session.subject.code,
  };

  const teacher = r.session.teacher
    ? {
        id: r.session.teacher.id,
        userId: r.session.teacher.userId,
        firstName: r.session.teacher.firstName,
        lastName: r.session.teacher.lastName,
        title: 'Dr.',
        email: r.session.teacher.email,
        subjectIds: [r.session.subjectId],
        createdAt: r.session.teacher.createdAt.toISOString(),
      }
    : undefined;

  const certificate = r.certificate
    ? {
        id: r.certificate.id,
        studentId: r.certificate.studentId,
        absenceIds: [r.id],
        fileName: r.certificate.fileName,
        fileType: r.certificate.fileType,
        fileSize: r.certificate.fileSize,
        dataUrl: r.certificate.dataUrl || undefined,
        startDate: r.certificate.startDate.toISOString().split('T')[0],
        endDate: r.certificate.endDate.toISOString().split('T')[0],
        status: (r.certificate.status?.toLowerCase() || 'pending') as any,
        uploadedByUserId: r.certificate.uploadedByUserId || '',
        uploadedAt: r.certificate.createdAt.toISOString(),
        reviewedByUserId: r.certificate.reviewedByUserId || undefined,
        reviewedAt: r.certificate.reviewedAt ? r.certificate.reviewedAt.toISOString() : undefined,
        reviewNote: r.certificate.reviewNote || undefined,
      }
    : undefined;

  return {
    absence,
    student,
    session,
    subject,
    teacher,
    certificate,
  };
}

export async function listAbsences(filters: {
  studentId?: string;
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {
    status: { in: [AttendanceStatus.ABSENT, AttendanceStatus.JUSTIFIED] },
  };

  if (filters.studentId) where.studentId = filters.studentId;

  if (filters.teacherId || filters.subjectId || filters.classId || filters.from || filters.to) {
    where.session = {};
    if (filters.teacherId) where.session.teacherId = filters.teacherId;
    if (filters.subjectId) where.session.subjectId = filters.subjectId;
    if (filters.classId) where.session.classId = filters.classId;

    if (filters.from && filters.to) {
      where.session.date = { gte: new Date(filters.from), lte: new Date(filters.to) };
    } else if (filters.from) {
      where.session.date = { gte: new Date(filters.from) };
    } else if (filters.to) {
      where.session.date = { lte: new Date(filters.to) };
    }
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.student = {
      OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { studentNumber: { contains: s, mode: 'insensitive' } },
      ],
    };
  }

  const [total, rawRecords] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      include: {
        student: { include: { class: true } },
        session: {
          include: { subject: true, teacher: true, class: true },
        },
        certificate: true,
      },
      orderBy: { recordedAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  let items = rawRecords.map(formatAbsenceRow);

  if (filters.status) {
    items = items.filter((r) => r.absence.status === filters.status);
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, pageCount };
}

export async function getAbsenceById(id: string) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: {
      student: { include: { class: true } },
      session: {
        include: { subject: true, teacher: true, class: true },
      },
      certificate: true,
    },
  });

  if (!record) throw new Error('Absence introuvable.');
  return formatAbsenceRow(record);
}

export async function createManualAbsence(input: {
  studentId: string;
  sessionId?: string;
  subjectId: string;
  teacherId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  note?: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, include: { class: true } });
  if (!student) throw new Error('Étudiant introuvable.');

  let teacherId = input.teacherId;
  if (!teacherId) {
    const t = await prisma.teacher.findFirst();
    if (!t) throw new Error('Aucun enseignant disponible.');
    teacherId = t.id;
  }

  let session: any = null;
  if (input.sessionId) {
    session = await prisma.attendanceSession.findUnique({
      where: { id: input.sessionId },
      include: { subject: true, teacher: true, class: true },
    });
  }

  if (!session) {
    let room = await prisma.room.findFirst();
    if (!room) room = await prisma.room.create({ data: { name: 'Salle Principale' } });

    session = await prisma.attendanceSession.create({
      data: {
        date: new Date(input.date),
        startTime: input.startTime || '08:30',
        endTime: input.endTime || '10:00',
        teacherId,
        subjectId: input.subjectId,
        classId: student.classId,
        roomId: room.id,
      },
      include: { subject: true, teacher: true, class: true },
    });
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId: session.id,
      studentId: student.id,
      status: AttendanceStatus.ABSENT,
      note: input.note,
    },
    include: {
      student: { include: { class: true } },
      session: { include: { subject: true, teacher: true, class: true } },
      certificate: true,
    },
  });

  await logActivity(
    'absence_created',
    `Absence saisie pour ${student.firstName} ${student.lastName}.`,
    teacherId,
    [student.userId || student.id]
  );

  return formatAbsenceRow(record);
}

export async function setAbsenceStatus(
  id: string,
  status: 'unjustified' | 'pending' | 'justified' | 'rejected',
  note?: string
) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: { student: true },
  });

  if (!record) throw new Error('Absence introuvable.');

  let attendanceStatus = record.status;
  if (status === 'justified') attendanceStatus = AttendanceStatus.JUSTIFIED;
  else if (status === 'unjustified' || status === 'rejected') attendanceStatus = AttendanceStatus.ABSENT;

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      status: attendanceStatus,
      note: note || record.note,
    },
    include: {
      student: { include: { class: true } },
      session: { include: { subject: true, teacher: true, class: true } },
      certificate: true,
    },
  });

  await logActivity(
    'absence_updated',
    `Statut de l'absence mis à jour: ${status}.`,
    record.student.userId || record.studentId,
    [record.student.userId || record.studentId]
  );

  return formatAbsenceRow(updated);
}

export async function deleteAbsence(id: string) {
  const record = await prisma.attendanceRecord.findUnique({ where: { id }, include: { student: true } });
  if (!record) throw new Error('Absence introuvable.');

  await prisma.attendanceRecord.delete({ where: { id } });

  await logActivity(
    'absence_deleted',
    `Absence supprimée.`,
    record.student.userId || record.studentId
  );
  return true;
}
