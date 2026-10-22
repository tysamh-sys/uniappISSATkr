import prisma from '../config/database.js';

export async function getAbsenceReasons() {
  return prisma.absenceReason.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getAbsenceReasonById(id: string) {
  const reason = await prisma.absenceReason.findUnique({ where: { id } });
  if (!reason) {
    throw new Error('Absence reason not found');
  }
  return reason;
}

export async function createAbsenceReason(data: { name: string; description?: string | null; requiresProof?: boolean }) {
  const existing = await prisma.absenceReason.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new Error(`Absence reason ${data.name} already exists`);
  }

  return prisma.absenceReason.create({ data });
}

export async function updateAbsenceReason(
  id: string,
  data: Partial<{ name: string; description: string | null; requiresProof: boolean }>
) {
  const existing = await prisma.absenceReason.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Absence reason not found');
  }

  return prisma.absenceReason.update({
    where: { id },
    data,
  });
}

export async function deleteAbsenceReason(id: string) {
  const existing = await prisma.absenceReason.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Absence reason not found');
  }

  return prisma.absenceReason.delete({ where: { id } });
}
