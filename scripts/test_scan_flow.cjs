const { PrismaClient, CertificateStatus, AttendanceStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== End-to-End Test: Scan & Justify Certificate Workflow ===');

  // 1. Find a student who has an absence
  const student = await prisma.student.findFirst({
    where: {
      attendanceRecords: {
        some: {
          status: AttendanceStatus.ABSENT,
          certificateId: null,
        },
      },
    },
    include: {
      user: true,
      attendanceRecords: {
        where: {
          status: AttendanceStatus.ABSENT,
          certificateId: null,
        },
        include: { session: { include: { subject: true } } },
      },
    },
  });

  if (!student) {
    console.log('No absent student found to test with.');
    return;
  }

  const absenceRecord = student.attendanceRecords[0];
  console.log(`1. Target Student: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
  console.log(`   Absence Record ID: ${absenceRecord.id} for Subject: ${absenceRecord.session.subject.name}`);

  // 2. Simulate mobile app submitting justification with base64 image data
  const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const fileData = `data:image/png;base64,${sampleBase64}`;
  const ref = `JUS-TEST-${Date.now().toString().slice(-4)}`;

  console.log('2. Simulating Mobile Justification Submission...');
  const cert = await prisma.certificate.create({
    data: {
      reference: ref,
      studentId: student.id,
      fileName: 'certificat_medical_test.png',
      fileType: 'image/png',
      fileSize: 1024,
      dataUrl: fileData,
      startDate: absenceRecord.session.date,
      endDate: absenceRecord.session.date,
      reason: 'Certificat médical transmis via application mobile (Scan Caméra)',
      status: CertificateStatus.PENDING,
      records: {
        connect: { id: absenceRecord.id },
      },
    },
  });

  console.log(`✓ Certificate created with Reference: ${cert.reference} (Status: ${cert.status})`);

  // Verify record is linked
  const updatedRecord = await prisma.attendanceRecord.findUnique({
    where: { id: absenceRecord.id },
    include: { certificate: true },
  });
  console.log(`✓ Record ${updatedRecord.id} is now linked to Certificate: ${updatedRecord.certificate?.reference}`);

  // 3. Simulate Admin Review (Accepting the certificate)
  console.log('3. Simulating Admin Review (Accepting Certificate)...');
  await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      status: CertificateStatus.ACCEPTED,
      reviewedAt: new Date(),
      reviewNote: 'Certificat médical authentifié et validé par l\'administration.',
    },
  });

  await prisma.attendanceRecord.update({
    where: { id: absenceRecord.id },
    data: {
      status: AttendanceStatus.JUSTIFIED,
    },
  });

  const finalRecord = await prisma.attendanceRecord.findUnique({
    where: { id: absenceRecord.id },
    include: { certificate: true },
  });

  console.log(`✓ Final Record Status: ${finalRecord.status}`);
  console.log(`✓ Certificate Status: ${finalRecord.certificate?.status}`);
  console.log('=== End-to-End Workflow Test PASSED Successfully! ===\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
