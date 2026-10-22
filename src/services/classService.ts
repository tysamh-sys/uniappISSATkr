import prisma from '../config/database.js';

export async function getClasses() {
  return prisma.class.findMany({
    include: {
      _count: {
        select: { students: true, timetableEntries: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getGroups() {
  const students = await prisma.student.findMany({
    select: { filiere: true, niveau: true, groupe: true },
  });

  const map = new Map<string, { filiere: string; niveau: string; groupe: string; count: number }>();
  for (const s of students) {
    const filiere = s.filiere || 'Informatique';
    const niveau = s.niveau || 'L3';
    const groupe = s.groupe || 'G1';
    const key = `${filiere}|${niveau}|${groupe}`;
    const curr = map.get(key) || { filiere, niveau, groupe, count: 0 };
    curr.count += 1;
    map.set(key, curr);
  }

  // If no students yet, provide standard university groups
  if (map.size === 0) {
    return [
      { filiere: 'Informatique', niveau: 'L3', groupe: 'G1', count: 0 },
      { filiere: 'Informatique', niveau: 'L3', groupe: 'G2', count: 0 },
      { filiere: 'Informatique', niveau: 'M1', groupe: 'G1', count: 0 },
    ];
  }

  return [...map.values()].sort((a, b) =>
    a.filiere.localeCompare(b.filiere) || a.niveau.localeCompare(b.niveau) || a.groupe.localeCompare(b.groupe)
  );
}

export async function getClassById(id: string) {
  const classItem = await prisma.class.findUnique({
    where: { id },
    include: {
      students: { orderBy: { lastName: 'asc' } },
      _count: { select: { timetableEntries: true } },
    },
  });

  if (!classItem) {
    throw new Error('Class not found');
  }

  return classItem;
}

export async function createClass(data: { name: string; code: string; filiere?: string; niveau?: string; groupe?: string }) {
  const existingName = await prisma.class.findUnique({ where: { name: data.name } });
  if (existingName) {
    throw new Error(`Class with name ${data.name} already exists`);
  }

  return prisma.class.create({ data });
}

export async function updateClass(id: string, data: Partial<{ name: string; code: string; filiere?: string; niveau?: string; groupe?: string }>) {
  const existing = await prisma.class.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Class not found');
  }

  return prisma.class.update({
    where: { id },
    data,
  });
}

export async function deleteClass(id: string) {
  const existing = await prisma.class.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Class not found');
  }

  return prisma.class.delete({ where: { id } });
}
