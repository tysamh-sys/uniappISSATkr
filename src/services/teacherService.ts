import prisma from '../config/database.js';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import { logActivity } from './activityService.js';

export function formatTeacherRow(t: any) {
  const status = t.user?.isActive ? 'active' : 'disabled';
  const roleLower = (t.user?.role?.toLowerCase() || 'teacher') as 'teacher';

  const user = {
    id: t.userId,
    email: t.email,
    role: roleLower,
    firstName: t.firstName,
    lastName: t.lastName,
    status,
    mustChangePassword: false,
    createdAt: t.user?.createdAt ? t.user.createdAt.toISOString() : t.createdAt.toISOString(),
  };

  const subjectMap = new Map<string, any>();
  if (t.timetableEntries) {
    t.timetableEntries.forEach((e: any) => {
      if (e.subject) {
        subjectMap.set(e.subject.id, {
          id: e.subject.id,
          name: e.subject.name,
          code: e.subject.code,
        });
      }
    });
  }

  const subjects = [...subjectMap.values()];
  const subjectIds = subjects.map((s) => s.id);

  const teacher = {
    id: t.id,
    userId: t.userId,
    firstName: t.firstName,
    lastName: t.lastName,
    title: 'Dr.',
    email: t.email,
    subjectIds,
    createdAt: t.createdAt.toISOString(),
  };

  return {
    teacher,
    user,
    subjects,
  };
}

export async function getTeachers(filters: {
  search?: string;
  status?: string;
  subjectId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { teacherNumber: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (filters.status) {
    where.user = { isActive: filters.status === 'active' };
  }

  if (filters.subjectId) {
    where.timetableEntries = {
      some: { subjectId: filters.subjectId },
    };
  }

  const [total, rawTeachers] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      include: {
        user: true,
        timetableEntries: {
          include: { subject: true },
        },
      },
      orderBy: { lastName: 'asc' },
      skip,
      take: pageSize,
    }),
  ]);

  const items = rawTeachers.map(formatTeacherRow);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getTeacherById(id: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      timetableEntries: {
        include: { class: true, subject: true, room: true },
      },
    },
  });

  if (!teacher) {
    throw new Error('Enseignant introuvable.');
  }

  return formatTeacherRow(teacher);
}

export async function createTeacher(
  data: {
    firstName: string;
    lastName: string;
    title?: string;
    email: string;
    phone?: string | null;
    subjectIds?: string[];
  },
  temporaryPassword?: string
) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new Error(`Un utilisateur avec l'email ${data.email} existe déjà.`);
  }

  const tempPass = temporaryPassword || Math.random().toString(36).slice(-8) + 'T1!';
  const passwordHash = await hashPassword(tempPass);
  const teacherNumber = `TCH-${Date.now().toString().slice(-4)}`;

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.TEACHER,
        isActive: true,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        teacherNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      },
      include: {
        user: true,
        timetableEntries: { include: { subject: true } },
      },
    });

    return teacher;
  });

  await logActivity(
    'teacher_created',
    `Enseignant ${data.firstName} ${data.lastName} créé.`,
    created.userId,
    [created.userId]
  );

  return formatTeacherRow(created);
}

export async function updateTeacher(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string | null;
    subjectIds?: string[];
  }
) {
  const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
  if (!teacher) throw new Error('Enseignant introuvable.');

  const updateTeacherData: any = {};
  if (data.firstName) updateTeacherData.firstName = data.firstName;
  if (data.lastName) updateTeacherData.lastName = data.lastName;
  if (data.email) updateTeacherData.email = data.email;
  if (data.phone !== undefined) updateTeacherData.phone = data.phone;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.email && data.email !== teacher.email) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: { email: data.email },
      });
    }

    return tx.teacher.update({
      where: { id },
      data: updateTeacherData,
      include: {
        user: true,
        timetableEntries: { include: { subject: true } },
      },
    });
  });

  await logActivity(
    'teacher_updated',
    `Enseignant ${updated.firstName} ${updated.lastName} mis à jour.`,
    teacher.userId,
    [teacher.userId]
  );

  return formatTeacherRow(updated);
}

export async function setTeacherStatus(id: string, status: 'active' | 'disabled') {
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw new Error('Enseignant introuvable.');

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { isActive: status === 'active' },
  });

  await logActivity(
    'teacher_status',
    `Statut de l'enseignant ${teacher.firstName} ${teacher.lastName} changé en ${status}.`,
    teacher.userId,
    [teacher.userId]
  );
}

export async function resetTeacherPassword(id: string, temporaryPassword?: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw new Error('Enseignant introuvable.');

  const tempPass = temporaryPassword || Math.random().toString(36).slice(-8) + 'T1!';
  const passwordHash = await hashPassword(tempPass);

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { passwordHash },
  });

  return tempPass;
}

export async function deleteTeacher(id: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { attendanceSessions: true },
  });
  if (!teacher) throw new Error('Enseignant introuvable.');

  if (teacher.attendanceSessions && teacher.attendanceSessions.length > 0) {
    throw new Error('Impossible de supprimer cet enseignant car des séances lui sont associées.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.timetableEntry.deleteMany({ where: { teacherId: id } });
    await tx.teacher.delete({ where: { id } });
    await tx.user.delete({ where: { id: teacher.userId } });
  });

  await logActivity(
    'teacher_deleted',
    `Enseignant ${teacher.firstName} ${teacher.lastName} supprimé.`,
    teacher.userId
  );
}
