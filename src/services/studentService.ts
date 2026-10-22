import prisma from '../config/database.js';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import { logActivity } from './activityService.js';

export function formatStudent(s: any) {
  return {
    id: s.id,
    userId: s.userId || s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    registrationNumber: s.studentNumber,
    email: s.email || (s.user?.email ?? ''),
    filiere: s.filiere || s.class?.filiere || 'Informatique',
    niveau: s.niveau || s.class?.niveau || 'L3',
    groupe: s.groupe || s.class?.groupe || 'G1',
    createdAt: s.createdAt.toISOString(),
  };
}

export async function getStudents(filters: {
  classId?: string;
  filiere?: string;
  niveau?: string;
  groupe?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.classId) where.classId = filters.classId;
  if (filters.filiere) where.filiere = filters.filiere;
  if (filters.niveau) where.niveau = filters.niveau;
  if (filters.groupe) where.groupe = filters.groupe;

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { studentNumber: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, rawStudents] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: { class: true, user: true },
      orderBy: { lastName: 'asc' },
      skip,
      take: pageSize,
    }),
  ]);

  const items = rawStudents.map(formatStudent);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function searchStudents(query: string, limit = 8) {
  const s = query.trim();
  const raw = await prisma.student.findMany({
    where: {
      OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { studentNumber: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ],
    },
    include: { class: true },
    take: limit,
    orderBy: { lastName: 'asc' },
  });
  return raw.map(formatStudent);
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      user: true,
      attendanceRecords: {
        include: { session: { include: { subject: true } }, absenceReason: true },
      },
    },
  });

  if (!student) {
    throw new Error('Étudiant introuvable.');
  }

  return formatStudent(student);
}

export async function createStudent(data: {
  firstName: string;
  lastName: string;
  registrationNumber: string;
  email: string;
  filiere: string;
  niveau: string;
  groupe: string;
  classId?: string;
}) {
  const existingNum = await prisma.student.findUnique({ where: { studentNumber: data.registrationNumber } });
  if (existingNum) {
    throw new Error(`Le numéro d'étudiant ${data.registrationNumber} est déjà utilisé.`);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingEmail) {
    throw new Error(`L'adresse email ${data.email} est déjà associée à un compte.`);
  }

  // Find or create class
  let classId = data.classId;
  if (!classId) {
    const classCode = `${data.niveau}-${data.groupe}`;
    let cls = await prisma.class.findFirst({
      where: {
        OR: [{ code: classCode }, { name: classCode }],
      },
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: `${data.filiere} ${classCode}`,
          code: classCode,
          filiere: data.filiere,
          niveau: data.niveau,
          groupe: data.groupe,
        },
      });
    }
    classId = cls.id;
  }

  const temporaryPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const passwordHash = await hashPassword(temporaryPassword);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        studentNumber: data.registrationNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        filiere: data.filiere,
        niveau: data.niveau,
        groupe: data.groupe,
        classId,
        isActive: true,
      },
      include: { class: true },
    });

    return { student: formatStudent(student), temporaryPassword, userId: user.id };
  });

  await logActivity(
    'student_created',
    `Étudiant ${data.firstName} ${data.lastName} créé.`,
    result.userId,
    [result.userId]
  );

  return { student: result.student, temporaryPassword: result.temporaryPassword };
}

export async function updateStudent(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    registrationNumber?: string;
    email?: string;
    filiere?: string;
    niveau?: string;
    groupe?: string;
    classId?: string;
  }
) {
  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) throw new Error('Étudiant introuvable.');

  const updateData: any = {};
  if (data.firstName) updateData.firstName = data.firstName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.registrationNumber) updateData.studentNumber = data.registrationNumber;
  if (data.email) updateData.email = data.email;
  if (data.filiere) updateData.filiere = data.filiere;
  if (data.niveau) updateData.niveau = data.niveau;
  if (data.groupe) updateData.groupe = data.groupe;
  if (data.classId) updateData.classId = data.classId;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.email && student.userId) {
      await tx.user.update({
        where: { id: student.userId },
        data: { email: data.email },
      });
    }

    return tx.student.update({
      where: { id },
      data: updateData,
      include: { class: true },
    });
  });

  if (student.userId) {
    await logActivity('student_updated', `Étudiant ${updated.firstName} ${updated.lastName} mis à jour.`, student.userId, [student.userId]);
  }

  return formatStudent(updated);
}

export async function deleteStudent(id: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new Error('Étudiant introuvable.');

  await prisma.$transaction(async (tx) => {
    await tx.attendanceRecord.deleteMany({ where: { studentId: id } });
    await tx.certificate.deleteMany({ where: { studentId: id } });
    await tx.student.delete({ where: { id } });
    if (student.userId) {
      await tx.user.delete({ where: { id: student.userId } });
    }
  });

  return true;
}

export async function resetStudentPassword(id: string) {
  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) throw new Error('Étudiant introuvable.');

  const tempPass = Math.random().toString(36).slice(-8) + 'B1!';
  const passwordHash = await hashPassword(tempPass);

  if (student.userId) {
    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash },
    });
  } else {
    const user = await prisma.user.create({
      data: {
        email: student.email || `${student.studentNumber}@university.edu`,
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });
    await prisma.student.update({
      where: { id },
      data: { userId: user.id },
    });
  }

  return tempPass;
}
