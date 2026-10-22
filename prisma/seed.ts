import { PrismaClient, Role, TimetableVersionStatus, DayOfWeek, AttendanceSessionStatus, AttendanceStatus, CertificateStatus, RequestStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clear existing data in reverse order of dependencies
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

  console.log('🧹 Cleaned existing database records.');

  // 2. Hash default passwords
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const adminTnPasswordHash = await bcrypt.hash('Admin123!', 10);
  const teacherPasswordHash = await bcrypt.hash('TeacherPass123!', 10);
  const profTnPasswordHash = await bcrypt.hash('Prof123!', 10);
  const studentPasswordHash = await bcrypt.hash('StudentPass123!', 10);
  const etudTnPasswordHash = await bcrypt.hash('Etud123!', 10);
  const mobileIssatkHash = await bcrypt.hash('issatk2025', 10);

  // 3. Create Users & Admin Accounts
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const adminTnUser = await prisma.user.create({
    data: {
      email: 'admin@univ.tn',
      passwordHash: adminTnPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('👤 Created Admin Users:', adminUser.email, adminTnUser.email);

  // 4. Create Teachers
  // Teacher Larbi
  const teacherLarbiUser = await prisma.user.create({
    data: {
      email: 'a.larbi@univ.tn',
      passwordHash: profTnPasswordHash,
      role: Role.TEACHER,
      isActive: true,
      teacher: {
        create: {
          teacherNumber: 'TCH-1000',
          firstName: 'Amine',
          lastName: 'Larbi',
          email: 'a.larbi@univ.tn',
          phone: '+216 71 123 456',
          department: 'Département Informatique',
        },
      },
    },
    include: { teacher: true },
  });

  // Mobile Demo Teacher: Sonia Mansouri (enseignant@issatk.rnu.tn / issatk2025)
  const teacherSoniaUser = await prisma.user.create({
    data: {
      email: 'enseignant@issatk.rnu.tn',
      passwordHash: mobileIssatkHash,
      role: Role.TEACHER,
      isActive: true,
      teacher: {
        create: {
          teacherNumber: 'TCH-2025-001',
          firstName: 'Sonia',
          lastName: 'Mansouri',
          email: 'enseignant@issatk.rnu.tn',
          phone: '+216 77 222 333',
          department: 'Département Informatique',
        },
      },
    },
    include: { teacher: true },
  });

  const teacherBenSalemUser = await prisma.user.create({
    data: {
      email: 'ben.salem@issatk.rnu.tn',
      passwordHash: profTnPasswordHash,
      role: Role.TEACHER,
      isActive: true,
      teacher: {
        create: {
          teacherNumber: 'TCH-2025-002',
          firstName: 'Kamel',
          lastName: 'Ben Salem',
          email: 'ben.salem@issatk.rnu.tn',
          phone: '+216 77 222 334',
          department: 'Département Informatique',
        },
      },
    },
    include: { teacher: true },
  });

  const teacherGharbiUser = await prisma.user.create({
    data: {
      email: 'gharbi@issatk.rnu.tn',
      passwordHash: profTnPasswordHash,
      role: Role.TEACHER,
      isActive: true,
      teacher: {
        create: {
          teacherNumber: 'TCH-2025-003',
          firstName: 'Mounira',
          lastName: 'Gharbi',
          email: 'gharbi@issatk.rnu.tn',
          phone: '+216 77 222 335',
          department: 'Département Informatique',
        },
      },
    },
    include: { teacher: true },
  });

  const teacherTrabelsiUser = await prisma.user.create({
    data: {
      email: 'trabelsi@issatk.rnu.tn',
      passwordHash: profTnPasswordHash,
      role: Role.TEACHER,
      isActive: true,
      teacher: {
        create: {
          teacherNumber: 'TCH-2025-004',
          firstName: 'Mourad',
          lastName: 'Trabelsi',
          email: 'trabelsi@issatk.rnu.tn',
          phone: '+216 77 222 336',
          department: 'Département Informatique',
        },
      },
    },
    include: { teacher: true },
  });

  const teacherLarbi = teacherLarbiUser.teacher!;
  const teacherSonia = teacherSoniaUser.teacher!;
  const teacherBenSalem = teacherBenSalemUser.teacher!;
  const teacherGharbi = teacherGharbiUser.teacher!;
  const teacherTrabelsi = teacherTrabelsiUser.teacher!;
  console.log('👨‍🏫 Created Teachers: Sonia Mansouri, Kamel Ben Salem, Mounira Gharbi, Mourad Trabelsi, Amine Larbi');

  // 5. Create Classes
  const classING2B = await prisma.class.create({
    data: { name: 'ING2-B', code: 'ING2-B', filiere: 'Ingénierie Informatique', niveau: 'ING2', groupe: 'B' },
  });
  const classING3A = await prisma.class.create({
    data: { name: 'ING3-A', code: 'ING3-A', filiere: 'Ingénierie Informatique', niveau: 'ING3', groupe: 'A' },
  });
  const class2CS = await prisma.class.create({
    data: { name: '2CS', code: 'CS-YEAR2', filiere: 'Informatique', niveau: 'L3', groupe: 'G1' },
  });
  const class1CS = await prisma.class.create({
    data: { name: '1CS', code: 'CS-YEAR1', filiere: 'Informatique', niveau: 'L2', groupe: 'G1' },
  });
  console.log('🏫 Created Classes: ING2-B, ING3-A, 2CS, 1CS');

  // 6. Create Subjects
  const subjectAL = await prisma.subject.create({
    data: { name: 'Architecture logicielle', code: 'AL201' },
  });
  const subjectSD = await prisma.subject.create({
    data: { name: 'Systèmes distribués', code: 'SD301' },
  });
  const subjectPI = await prisma.subject.create({
    data: { name: 'Projet intégré', code: 'PI302' },
  });
  const subjectWeb = await prisma.subject.create({
    data: { name: 'Développement Web', code: 'WEB201' },
  });
  const subjectNet = await prisma.subject.create({
    data: { name: 'Réseaux informatiques', code: 'NET201' },
  });
  const subjectDb = await prisma.subject.create({
    data: { name: 'Bases de données', code: 'DB201' },
  });
  const subjectMob = await prisma.subject.create({
    data: { name: 'Programmation mobile', code: 'MOB201' },
  });
  console.log('📚 Created 7 Subjects');

  // 7. Create Rooms
  const roomLab2 = await prisma.room.create({
    data: { name: 'Labo 02', building: 'Bloc C', capacity: 30 },
  });
  const roomLab3 = await prisma.room.create({
    data: { name: 'Labo 03', building: 'Bloc C', capacity: 30 },
  });
  const roomB12 = await prisma.room.create({
    data: { name: 'Salle B12', building: 'Bloc B', capacity: 40 },
  });
  const roomC08 = await prisma.room.create({
    data: { name: 'Salle C08', building: 'Bloc C', capacity: 35 },
  });
  const roomP04 = await prisma.room.create({
    data: { name: 'Salle P04', building: 'Bloc Projets', capacity: 25 },
  });
  const roomAmphiA = await prisma.room.create({
    data: { name: 'Amphi A', building: 'Amphithéâtres', capacity: 150 },
  });
  console.log('🚪 Created 6 Rooms');

  // 8. Create Students for ING2-B (including mobile demo Amine Ben Amor)
  const studentsING2BData = [
    { studentNumber: '2023-ING-0142', firstName: 'Amine', lastName: 'Ben Amor', email: 'etudiant@issatk.rnu.tn', isDemo: true },
    { studentNumber: 'ING2-002', firstName: 'Sarra', lastName: 'Khelifi', email: 'sarra.khelifi@issatk.rnu.tn' },
    { studentNumber: 'ING2-003', firstName: 'Youssef', lastName: 'Hamdi', email: 'youssef.hamdi@issatk.rnu.tn' },
    { studentNumber: 'ING2-004', firstName: 'Mariem', lastName: 'Jlassi', email: 'mariem.jlassi@issatk.rnu.tn' },
    { studentNumber: 'ING2-005', firstName: 'Aziz', lastName: 'Ayari', email: 'aziz.ayari@issatk.rnu.tn' },
    { studentNumber: 'ING2-006', firstName: 'Nour', lastName: 'Chaabane', email: 'nour.chaabane@issatk.rnu.tn' },
  ];

  const createdStudentsING2B: any[] = [];
  for (const s of studentsING2BData) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: s.isDemo ? mobileIssatkHash : studentPasswordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        userId: user.id,
        classId: classING2B.id,
        filiere: 'Ingénierie Informatique',
        niveau: 'ING2',
        groupe: 'B',
        isActive: true,
      },
    });
    createdStudentsING2B.push({ student, user });
  }

  // Also seed 2CS Lina Benali for compatibility
  const userLina = await prisma.user.create({
    data: {
      email: 'lina.benali@etu.univ.tn',
      passwordHash: etudTnPasswordHash,
      role: Role.STUDENT,
      isActive: true,
    },
  });
  await prisma.student.create({
    data: {
      studentNumber: 'STD-2024-000',
      firstName: 'Lina',
      lastName: 'Benali',
      email: 'lina.benali@etu.univ.tn',
      userId: userLina.id,
      classId: class2CS.id,
      filiere: 'Informatique',
      niveau: 'L3',
      groupe: 'G1',
      isActive: true,
    },
  });

  const amineStudent = createdStudentsING2B[0].student;
  const amineUser = createdStudentsING2B[0].user;
  console.log(`🎓 Created ${createdStudentsING2B.length + 1} Students including Amine Ben Amor (etudiant@issatk.rnu.tn)`);

  // 9. Absence Reasons
  const reasonMedical = await prisma.absenceReason.create({
    data: { name: 'Medical', description: 'Certified doctor note or illness', requiresProof: true },
  });
  const reasonUnknown = await prisma.absenceReason.create({
    data: { name: 'Unknown', description: 'Unexplained absence', requiresProof: false },
  });

  // 10. Timetable Version
  const timetableVersion = await prisma.timetableVersion.create({
    data: {
      name: 'Semestre 2 — 2024/2025',
      validFrom: new Date('2025-01-15T00:00:00Z'),
      validUntil: new Date('2025-06-30T23:59:59Z'),
      status: TimetableVersionStatus.ACTIVE,
    },
  });

  // 11. Timetable Entries for ING2-B & Teachers
  // Monday: Web Dev (08:30–10:00) ING2-B
  const entryMon1 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:30',
      endTime: '10:00',
      teacherId: teacherBenSalem.id,
      classId: classING2B.id,
      subjectId: subjectWeb.id,
      roomId: roomB12.id,
    },
  });

  // Monday: Databases (10:15–11:45) ING2-B
  const entryMon2 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '10:15',
      endTime: '11:45',
      teacherId: teacherGharbi.id,
      classId: classING2B.id,
      subjectId: subjectDb.id,
      roomId: roomLab3.id,
    },
  });

  // Monday: Networks (13:30–15:00) ING2-B
  const entryMon3 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '13:30',
      endTime: '15:00',
      teacherId: teacherTrabelsi.id,
      classId: classING2B.id,
      subjectId: subjectNet.id,
      roomId: roomAmphiA.id,
    },
  });

  // Tuesday: Sonia Mansouri - Systèmes distribués (09:00–10:30) ING3-A
  const entryTue1 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '09:00',
      endTime: '10:30',
      teacherId: teacherSonia.id,
      classId: classING3A.id,
      subjectId: subjectSD.id,
      roomId: roomC08.id,
    },
  });

  // Tuesday: Sonia Mansouri - Architecture logicielle (11:00–12:30) ING2-B
  const entryTue2 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '11:00',
      endTime: '12:30',
      teacherId: teacherSonia.id,
      classId: classING2B.id,
      subjectId: subjectAL.id,
      roomId: roomLab2.id,
    },
  });

  // Tuesday: Sonia Mansouri - Projet intégré (14:00–15:30) ING3-A
  const entryTue3 = await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '14:00',
      endTime: '15:30',
      teacherId: teacherSonia.id,
      classId: classING3A.id,
      subjectId: subjectPI.id,
      roomId: roomP04.id,
    },
  });

  // Wednesday: Mobile Programming (08:30–10:00) ING2-B
  await prisma.timetableEntry.create({
    data: {
      timetableVersionId: timetableVersion.id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '08:30',
      endTime: '10:00',
      teacherId: teacherBenSalem.id,
      classId: classING2B.id,
      subjectId: subjectMob.id,
      roomId: roomLab2.id,
    },
  });

  // 12. Create Attendance Sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Session 1: Sonia Mansouri - AL for ING2-B (Scheduled / Ready to roll-call)
  const sessionAL = await prisma.attendanceSession.create({
    data: {
      reference: 'ATT-250318-042',
      timetableEntryId: entryTue2.id,
      date: today,
      teacherId: teacherSonia.id,
      classId: classING2B.id,
      subjectId: subjectAL.id,
      roomId: roomLab2.id,
      startTime: '11:00',
      endTime: '12:30',
      status: AttendanceSessionStatus.OPEN,
    },
  });

  // Session 2: Web Dev for ING2-B (Submitted / Present for Amine)
  const sessionWeb = await prisma.attendanceSession.create({
    data: {
      reference: 'ATT-250318-011',
      timetableEntryId: entryMon1.id,
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      teacherId: teacherBenSalem.id,
      classId: classING2B.id,
      subjectId: subjectWeb.id,
      roomId: roomB12.id,
      startTime: '08:30',
      endTime: '10:00',
      status: AttendanceSessionStatus.SUBMITTED,
      submittedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    },
  });

  // Session 3: Databases for ING2-B (Absent for Amine, but Justified)
  const sessionDb = await prisma.attendanceSession.create({
    data: {
      reference: 'ATT-250314-009',
      timetableEntryId: entryMon2.id,
      date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      teacherId: teacherGharbi.id,
      classId: classING2B.id,
      subjectId: subjectDb.id,
      roomId: roomLab3.id,
      startTime: '10:15',
      endTime: '11:45',
      status: AttendanceSessionStatus.SUBMITTED,
      submittedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
    },
  });

  // Session 4: Networks for ING2-B (Absent for Amine, Pending justification)
  const sessionNet = await prisma.attendanceSession.create({
    data: {
      reference: 'ATT-250312-005',
      timetableEntryId: entryMon3.id,
      date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      teacherId: teacherTrabelsi.id,
      classId: classING2B.id,
      subjectId: subjectNet.id,
      roomId: roomAmphiA.id,
      startTime: '13:30',
      endTime: '15:00',
      status: AttendanceSessionStatus.SUBMITTED,
      submittedAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
    },
  });

  // Create student records for ING2-B students
  // 1. Session Web: Amine Present
  await prisma.attendanceRecord.create({
    data: {
      sessionId: sessionWeb.id,
      studentId: amineStudent.id,
      status: AttendanceStatus.PRESENT,
      remarks: 'Présent en cours',
    },
  });

  // 2. Session Databases: Amine Justified Absence
  const certJustified = await prisma.certificate.create({
    data: {
      reference: 'JUS-250314-008',
      studentId: amineStudent.id,
      medicalCenter: 'Centre Médical Universitaire Kairouan',
      reason: 'Syndrome grippal avec repos prescrit',
      fileName: 'certificat_medical_dr_kairouan.pdf',
      fileType: 'application/pdf',
      fileSize: 45200,
      startDate: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: CertificateStatus.ACCEPTED,
      uploadedByUserId: amineUser.id,
      reviewedByUserId: teacherGharbiUser.id,
      reviewedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      reviewNote: 'Certificat médical validé par le service de santé',
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: sessionDb.id,
      studentId: amineStudent.id,
      status: AttendanceStatus.JUSTIFIED,
      absenceReasonId: reasonMedical.id,
      certificateId: certJustified.id,
      remarks: 'Absence justifiée par certificat',
    },
  });

  // 3. Session Networks: Amine Absent (Pending review)
  const certPending = await prisma.certificate.create({
    data: {
      reference: 'JUS-250318-018',
      studentId: amineStudent.id,
      medicalCenter: 'Cabinet Dr. Sami Khelil',
      reason: 'Visite médicale spécialisée',
      fileName: 'certificat_scanner_18mars.jpg',
      fileType: 'image/jpeg',
      fileSize: 128400,
      startDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      status: CertificateStatus.PENDING,
      uploadedByUserId: amineUser.id,
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: sessionNet.id,
      studentId: amineStudent.id,
      status: AttendanceStatus.ABSENT,
      absenceReasonId: reasonUnknown.id,
      certificateId: certPending.id,
      remarks: 'Certificat en attente de validation',
    },
  });

  // 13. Create Teacher Administrative Requests (for Sonia Mansouri)
  await prisma.administrativeRequest.create({
    data: {
      reference: 'REQ-2041',
      teacherId: teacherSonia.id,
      type: 'Modification de séance',
      date: new Date('2025-03-21T09:00:00Z'),
      reason: 'Déplacement de la séance de TD au vendredi après-midi en raison d’un séminaire.',
      status: RequestStatus.PENDING,
    },
  });

  await prisma.administrativeRequest.create({
    data: {
      reference: 'REQ-1998',
      teacherId: teacherSonia.id,
      type: 'Absence prévue',
      date: new Date('2025-03-03T08:00:00Z'),
      reason: 'Participation au congrès national de génie logiciel à Tunis.',
      status: RequestStatus.APPROVED,
      reviewedAt: new Date('2025-03-04T10:00:00Z'),
      reviewNote: 'Approuvée par le chef de département.',
    },
  });

  // 14. Create Announcements
  const announcementRoomChange = await prisma.announcement.create({
    data: {
      title: 'Changement de salle',
      message: 'Le cours aura lieu dans l’amphithéâtre A au lieu de la salle C04.',
      teacherId: teacherTrabelsi.id,
      classId: classING2B.id,
      subjectId: subjectNet.id,
    },
  });

  // 15. Create Notifications for Student Amine
  await prisma.notification.createMany({
    data: [
      {
        userId: amineUser.id,
        title: 'Changement de salle',
        message: 'Réseaux informatiques aura lieu en Amphi A.',
        type: 'schedule',
        icon: 'megaphone',
        isRead: false,
      },
      {
        userId: amineUser.id,
        title: 'Présence mise à jour',
        message: 'Votre présence au cours de Développement Web est confirmée.',
        type: 'attendance',
        icon: 'check',
        isRead: true,
      },
      {
        userId: amineUser.id,
        title: 'Justificatif approuvé',
        message: 'Votre absence du 14 mars est maintenant justifiée.',
        type: 'certificate',
        icon: 'calendar',
        isRead: true,
      },
    ],
  });

  // Notifications for Teacher Sonia
  await prisma.notification.createMany({
    data: [
      {
        userId: teacherSoniaUser.id,
        title: 'Cours dans 30 minutes',
        message: 'Architecture logicielle · ING2-B · Labo 02',
        type: 'schedule',
        icon: 'clock',
        isRead: false,
      },
      {
        userId: teacherSoniaUser.id,
        title: 'Mise à jour administrative',
        message: 'Votre demande REQ-2041 a été transmise au département pédagogique.',
        type: 'admin',
        icon: 'check',
        isRead: true,
      },
      {
        userId: teacherSoniaUser.id,
        title: 'Emploi du temps modifié',
        message: 'Le cours du vendredi est déplacé à 10:00.',
        type: 'schedule',
        icon: 'calendar',
        isRead: true,
      },
    ],
  });

  console.log('✅ Seed completed successfully with ISSATK Mobile demo data (Student Amine Ben Amor, Teacher Sonia Mansouri, Sessions, Notifications, Requests & Announcements)!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
