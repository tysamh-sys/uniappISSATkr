import prisma from '../config/database.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { logActivity } from './activityService.js';

export function formatAuthSession(user: any, token?: string) {
  const roleLower = user.role.toLowerCase() as 'admin' | 'teacher' | 'student';
  const status = user.isActive ? 'active' : 'disabled';

  let firstName = 'Admin';
  let lastName = 'Système';

  if (user.teacher) {
    firstName = user.teacher.firstName;
    lastName = user.teacher.lastName;
  } else if (user.student) {
    firstName = user.student.firstName;
    lastName = user.student.lastName;
  }

  const teacherData = user.teacher
    ? {
        id: user.teacher.id,
        userId: user.id,
        firstName: user.teacher.firstName,
        lastName: user.teacher.lastName,
        title: 'Dr.',
        email: user.teacher.email,
        phone: user.teacher.phone,
        subjectIds: user.teacher.timetableEntries
          ? [...new Set(user.teacher.timetableEntries.map((e: any) => e.subjectId))]
          : [],
        createdAt: user.teacher.createdAt.toISOString(),
      }
    : undefined;

  const studentData = user.student
    ? {
        id: user.student.id,
        userId: user.id,
        firstName: user.student.firstName,
        lastName: user.student.lastName,
        registrationNumber: user.student.studentNumber,
        email: user.student.email || user.email,
        filiere: user.student.filiere || 'Informatique',
        niveau: user.student.niveau || 'L3',
        groupe: user.student.groupe || 'G1',
        createdAt: user.student.createdAt.toISOString(),
      }
    : undefined;

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: roleLower,
      firstName,
      lastName,
      status,
      mustChangePassword: false,
      createdAt: user.createdAt.toISOString(),
    },
    teacher: teacherData,
    student: studentData,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      teacher: {
        include: { timetableEntries: { select: { subjectId: true } } },
      },
      student: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  const authUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    teacherId: user.teacher?.id,
    studentId: user.student?.id,
  };

  const token = generateToken(authUser);
  return formatAuthSession(user, token);
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacher: {
        include: { timetableEntries: { select: { subjectId: true } } },
      },
      student: true,
    },
  });

  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  return formatAuthSession(user);
}

export async function changeUserPassword(userId: string, currentPass: string, nextPass: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Utilisateur introuvable.');

  const isMatch = await comparePassword(currentPass, user.passwordHash);
  if (!isMatch) throw new Error('Le mot de passe actuel est incorrect.');

  if (nextPass.length < 6) {
    throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères.');
  }

  const newHash = await hashPassword(nextPass);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await logActivity('password_changed', 'Mot de passe modifié avec succès.', userId, [userId]);
  return getUserProfile(userId);
}
