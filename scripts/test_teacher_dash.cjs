const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.teacher.findFirst({
    include: { user: true }
  });
  console.log('Testing Teacher Dashboard for:', teacher.firstName, teacher.lastName, teacher.id);
  
  // Test timetable entries for this teacher
  const entries = await prisma.timetableEntry.findMany({
    where: { teacherId: teacher.id },
    include: { class: true, subject: true, room: true }
  });
  console.log(`Found ${entries.length} timetable entries for this teacher.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
