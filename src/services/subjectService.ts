import prisma from '../config/database.js';

export async function getSubjects() {
  return prisma.subject.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getSubjectById(id: string) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) {
    throw new Error('Subject not found');
  }
  return subject;
}

export async function createSubject(data: { name: string; code: string }) {
  const existing = await prisma.subject.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new Error(`Subject with code ${data.code} already exists`);
  }

  return prisma.subject.create({ data });
}

export async function updateSubject(id: string, data: Partial<{ name: string; code: string }>) {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Subject not found');
  }

  return prisma.subject.update({
    where: { id },
    data,
  });
}

export async function deleteSubject(id: string) {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Subject not found');
  }

  return prisma.subject.delete({ where: { id } });
}
