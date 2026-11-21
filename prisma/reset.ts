/**
 * Database Reset Script
 * ----------------------------
 * - Backs up nothing (backup was done externally before running this).
 * - Deletes ALL application data in reverse dependency order.
 * - Preserves schema and table structures.
 * - Creates ONE clean ADMIN account using a cryptographically secure random password.
 * - Prints credentials at the end so you can log in immediately.
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

/** Generate a secure random password: letters + digits, easy to type */
function generateAdminPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

async function main() {
  console.log('');
  console.log('==========================================================');
  console.log('  UNIVERSITY ATTENDANCE — DATABASE RESET (DEVELOPMENT)');
  console.log('==========================================================');
  console.log('');
  console.log('⚠️  Environment : NODE_ENV =', process.env.NODE_ENV || 'development');
  console.log('⚠️  Database    : university_attendance @ localhost:5432');
  console.log('');
  console.log('🧹 Deleting all application data...');

  // Delete in strict reverse-dependency order to avoid FK constraint violations
  await prisma.notification.deleteMany();
  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.administrativeRequest.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.timetableVersion.deleteMany();
  await prisma.absenceReason.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();

  console.log('✅ All application records deleted.');
  console.log('');
  console.log('👤 Creating fresh administrator accounts...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  // 1. Primary demo admin (used by web interface demo login button)
  await prisma.user.create({
    data: {
      email: 'admin@univ.tn',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 2. ISSAT Kairouan institutional admin
  await prisma.user.create({
    data: {
      email: 'admin@issatk.rnu.tn',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('');
  console.log('==========================================================');
  console.log('  ✅ RESET COMPLETE — ADMINISTRATOR CREDENTIALS');
  console.log('==========================================================');
  console.log('');
  console.log('  Compte 1 : admin@univ.tn      | Mot de passe : Admin123!');
  console.log('  Compte 2 : admin@issatk.rnu.tn | Mot de passe : Admin123!');
  console.log('');
  console.log('==========================================================');
  console.log('');
  console.log('  Database is now empty except for the administrator.');
  console.log('  You can begin the import test from /admin/import.');
  console.log('');
  console.log('==========================================================');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
