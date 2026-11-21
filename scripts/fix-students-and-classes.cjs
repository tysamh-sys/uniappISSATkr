const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseClassInfo(className) {
  const clean = (className || '').trim();
  if (!clean) return { niveau: '', filiere: '', groupe: '' };

  // 1. Tunisian / French format: ^(\d+)([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(\d+)$
  // e.g. "1BigData1", "2ENR.1", "3EEA-AII1", "1GM10", "1MRDS1", "2EEA1", "3ISI.3"
  const m1 = clean.match(/^(\d+)([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(\d+)$/);
  if (m1) {
    return {
      niveau: m1[1],
      filiere: m1[2],
      groupe: `G${m1[3]}`,
    };
  }

  // 2. Format with letter prefix: e.g. "L1-EEA-G1", "M2_DS_2"
  const m2 = clean.match(/^([a-zA-Z]+\d+)[.\-_]?([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(?:G|g|gr|GR)?(\d+)$/);
  if (m2) {
    return {
      niveau: m2[1],
      filiere: m2[2],
      groupe: `G${m2[3]}`,
    };
  }

  // 3. Fallback
  return {
    niveau: '1',
    filiere: clean,
    groupe: 'G1',
  };
}

async function run() {
  console.log('=== FIXING CLASSES & STUDENTS IN DATABASE ===\n');

  // 1. Update Classes
  const classes = await prisma.class.findMany();
  console.log(`Found ${classes.length} classes in DB.`);

  let updatedClassesCount = 0;
  for (const c of classes) {
    const parsed = parseClassInfo(c.name);
    await prisma.class.update({
      where: { id: c.id },
      data: {
        filiere: parsed.filiere,
        niveau: parsed.niveau,
        groupe: parsed.groupe,
      },
    });
    updatedClassesCount++;
  }
  console.log(`✅ Updated ${updatedClassesCount} classes with accurate filiere, niveau, groupe.`);

  // 2. Update Students based on their linked Class
  const students = await prisma.student.findMany({
    include: { class: true },
  });
  console.log(`Found ${students.length} students in DB.`);

  let updatedStudentsCount = 0;
  for (const s of students) {
    const cls = s.class;
    let filiere = cls?.filiere;
    let niveau = cls?.niveau;
    let groupe = cls?.groupe;

    if (!filiere || !niveau || !groupe) {
      const parsed = parseClassInfo(cls?.name || '');
      filiere = filiere || parsed.filiere;
      niveau = niveau || parsed.niveau;
      groupe = groupe || parsed.groupe;
    }

    await prisma.student.update({
      where: { id: s.id },
      data: {
        filiere,
        niveau,
        groupe,
      },
    });
    updatedStudentsCount++;
  }
  console.log(`✅ Updated ${updatedStudentsCount} students with accurate filiere, niveau, groupe.`);

  // 3. Verification distribution
  console.log('\n=== VERIFICATION POST-UPDATE ===');
  const filieres = await prisma.student.groupBy({
    by: ['filiere'],
    _count: true,
    orderBy: { filiere: 'asc' },
  });
  console.log('\nDistribution by Filière:');
  console.table(filieres.map(f => ({ filiere: f.filiere, count: f._count })));

  const niveaux = await prisma.student.groupBy({
    by: ['niveau'],
    _count: true,
    orderBy: { niveau: 'asc' },
  });
  console.log('\nDistribution by Niveau:');
  console.table(niveaux.map(n => ({ niveau: n.niveau, count: n._count })));

  const groupes = await prisma.student.groupBy({
    by: ['groupe'],
    _count: true,
    orderBy: { groupe: 'asc' },
  });
  console.log('\nDistribution by Groupe:');
  console.table(groupes.map(g => ({ groupe: g.groupe, count: g._count })));

  // Sample check for specific classes requested by user: 1MRDS1, 2EEA1
  console.log('\n=== SAMPLE CHECK (user examples: 1MRDS1, 2EEA1) ===');
  const sampleClasses = ['1MRDS1', '2EEA1', '3ISI.3', '1BigData3'];
  for (const name of sampleClasses) {
    const sample = await prisma.student.findFirst({
      where: { class: { name } },
      select: {
        studentNumber: true,
        firstName: true,
        lastName: true,
        filiere: true,
        niveau: true,
        groupe: true,
        class: { select: { name: true } }
      }
    });
    console.log(`Sample in ${name}:`, sample);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
