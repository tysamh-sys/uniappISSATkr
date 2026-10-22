import prisma from '../config/database.js';
import { AttendanceSessionStatus, AttendanceStatus } from '@prisma/client';
import { formatStudent } from './studentService.js';
import { logActivity } from './activityService.js';

export function formatSession(s: any) {
  const dateStr = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0];
  return {
    id: s.id,
    subjectId: s.subjectId,
    teacherId: s.teacherId,
    date: dateStr,
    startTime: s.startTime,
    endTime: s.endTime,
    filiere: s.class?.filiere || 'Informatique',
    niveau: s.class?.niveau || 'L3',
    groupe: s.class?.groupe || 'G1',
    createdAt: s.createdAt.toISOString(),
  };
}

export function formatSessionRow(s: any) {
  const session = formatSession(s);
  const subject = {
    id: s.subject.id,
    name: s.subject.name,
    code: s.subject.code,
  };

  const teacher = s.teacher
    ? {
        id: s.teacher.id,
        userId: s.teacher.userId,
        firstName: s.teacher.firstName,
        lastName: s.teacher.lastName,
        title: 'Dr.',
        email: s.teacher.email,
        subjectIds: [s.subjectId],
        createdAt: s.teacher.createdAt.toISOString(),
      }
    : undefined;

  const records = s.records || [];
  const absentCount = records.filter(
    (r: any) => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.JUSTIFIED
  ).length;
  const studentCount = records.length;

  return {
    session,
    subject,
    teacher,
    absentCount,
    studentCount,
  };
}

export async function listSessions(filters: {
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  date?: string;
  filiere?: string;
  niveau?: string;
  groupe?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.classId) where.classId = filters.classId;

  if (filters.date) {
    where.date = new Date(filters.date);
  }

  if (filters.filiere || filters.niveau || filters.groupe) {
    where.class = {};
    if (filters.filiere) where.class.filiere = filters.filiere;
    if (filters.niveau) where.class.niveau = filters.niveau;
    if (filters.groupe) where.class.groupe = filters.groupe;
  }

  const [total, rawSessions] = await Promise.all([
    prisma.attendanceSession.count({ where }),
    prisma.attendanceSession.findMany({
      where,
      include: {
        subject: true,
        teacher: true,
        class: true,
        records: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  const items = rawSessions.map(formatSessionRow);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, pageSize, pageCount };
}

export async function getSessionDetail(id: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      subject: true,
      teacher: true,
      class: true,
      records: {
        include: { student: true, certificate: true },
      },
    },
  });

  if (!session) throw new Error('Séance introuvable.');

  const row = formatSessionRow(session);

  // Fetch all students in this class
  const classStudents = await prisma.student.findMany({
    where: { classId: session.classId },
    orderBy: { lastName: 'asc' },
  });

  const students = classStudents.map(formatStudent);

  const absences = session.records
    .filter((r) => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.JUSTIFIED)
    .map((r) => {
      let status = 'unjustified';
      if (r.status === AttendanceStatus.JUSTIFIED) status = 'justified';
      else if (r.certificateId) status = 'pending';

      return {
        id: r.id,
        studentId: r.studentId,
        sessionId: r.sessionId,
        status: status as any,
        certificateId: r.certificateId || undefined,
        note: r.note || r.remarks || undefined,
        createdAt: r.recordedAt.toISOString(),
        updatedAt: r.recordedAt.toISOString(),
      };
    });

  return { row, students, absences };
}

export async function saveRollCall(input: {
  sessionId?: string;
  subjectId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  filiere: string;
  niveau: string;
  groupe: string;
  absentStudentIds: string[];
}) {
  const dateObj = new Date(input.date);

  // Find class
  let cls = await prisma.class.findFirst({
    where: {
      filiere: input.filiere,
      niveau: input.niveau,
      groupe: input.groupe,
    },
  });

  if (!cls) {
    cls = await prisma.class.create({
      data: {
        name: `${input.filiere} ${input.niveau}-${input.groupe}`,
        code: `${input.niveau}-${input.groupe}`,
        filiere: input.filiere,
        niveau: input.niveau,
        groupe: input.groupe,
      },
    });
  }

  // Get Room
  let room = await prisma.room.findFirst();
  if (!room) {
    room = await prisma.room.create({ data: { name: 'Salle Principale' } });
  }

  let session = input.sessionId
    ? await prisma.attendanceSession.findUnique({ where: { id: input.sessionId } })
    : null;

  if (!session) {
    session = await prisma.attendanceSession.create({
      data: {
        date: dateObj,
        startTime: input.startTime,
        endTime: input.endTime,
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        classId: cls.id,
        roomId: room.id,
        status: AttendanceSessionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  } else {
    session = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: AttendanceSessionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  const students = await prisma.student.findMany({ where: { classId: cls.id } });
  const absentSet = new Set(input.absentStudentIds);

  let added = 0;
  let removed = 0;
  const kept: any[] = [];

  for (const st of students) {
    const isAbsent = absentSet.has(st.id);
    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: st.id } },
    });

    if (existing) {
      if (isAbsent && existing.status === AttendanceStatus.PRESENT) {
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: AttendanceStatus.ABSENT },
        });
        added += 1;
      } else if (!isAbsent && existing.status !== AttendanceStatus.PRESENT) {
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: AttendanceStatus.PRESENT },
        });
        removed += 1;
      } else if (isAbsent) {
        kept.push(formatStudent(st));
      }
    } else {
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: st.id,
          status: isAbsent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        },
      });
      if (isAbsent) added += 1;
    }
  }

  await logActivity(
    'session_saved',
    `Appel enregistré pour la séance du ${input.date}.`,
    input.teacherId
  );

  return {
    session: formatSession({ ...session, class: cls }),
    added,
    removed,
    kept,
  };
}

export async function deleteSession(id: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id } });
  if (!session) throw new Error('Séance introuvable.');

  await prisma.attendanceSession.delete({ where: { id } });
  return true;
}
