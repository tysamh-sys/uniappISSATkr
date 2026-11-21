import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);
  
  // Ensure admin@univ.tn is ready
  await prisma.user.upsert({
    where: { email: 'admin@univ.tn' },
    update: { passwordHash: hash, role: Role.ADMIN, isActive: true },
    create: { email: 'admin@univ.tn', passwordHash: hash, role: Role.ADMIN, isActive: true },
  });

  // Ensure admin@issatk.rnu.tn also works with Admin123!
  await prisma.user.upsert({
    where: { email: 'admin@issatk.rnu.tn' },
    update: { passwordHash: hash, role: Role.ADMIN, isActive: true },
    create: { email: 'admin@issatk.rnu.tn', passwordHash: hash, role: Role.ADMIN, isActive: true },
  });

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  console.log('Current Admin Users in DB:', users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
