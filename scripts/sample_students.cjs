const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    take: 5,
    include: { user: true, class: true }
  });
  console.log(JSON.stringify(students.map(s => ({
    email: s.user?.email || s.email,
    name: s.firstName + ' ' + s.lastName,
    class: s.class.name,
    studentNumber: s.studentNumber
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
