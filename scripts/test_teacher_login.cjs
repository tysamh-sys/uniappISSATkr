const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({
    take: 3,
    include: { user: true }
  });
  console.log('Sample Teachers in DB:');
  teachers.forEach(t => {
    console.log(`- ${t.firstName} ${t.lastName} (${t.email}), User Active: ${t.user?.isActive}, User Role: ${t.user?.role}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
