import prisma from '../config/database.js';
import { CertificateStatus, AttendanceStatus } from '@prisma/client';
import { formatStudent } from './studentService.js';
import { formatAbsenceRow } from './absenceService.js';
import { logActivity } from './activityService.js';

export function formatCertificate(c: any) {
  return {
    id: c.id,
    studentId: c.studentId,
    absenceIds: c.records ? c.records.map((r: any) => r.id) : [],
    fileName: c.fileName,
    fileType: c.fileType,
    fileSize: c.fileSize,
    dataUrl: c.dataUrl || undefined,
    startDate: c.startDate instanceof Date ? c.startDate.toISOString().split('T')[0] : String(c.startDate).split('T')[0],
    endDate: c.endDate instanceof Date ? c.endDate.toISOString().split('T')[0] : String(c.endDate).split('T')[0],
    status: (c.status?.toLowerCase() || 'pending') as 'pending' | 'accepted' | 'rejected',
    uploadedByUserId: c.uploadedByUserId || '',
    uploadedAt: c.createdAt.toISOString(),
    reviewedByUserId: c.reviewedByUserId || undefined,
    reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : undefined,
    reviewNote: c.reviewNote || undefined,
  };
}

export function formatCertificateRow(c: any) {
  const certificate = formatCertificate(c);
  const student = formatStudent(c.student);
  const absences = (c.records || []).map(formatAbsenceRow);

  return {
    certificate,
    student,
    absences,
  };
}

export async function listCertificates(filters: {
  studentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.status) {
    where.status = filters.status.toUpperCase() as CertificateStatus;
  }

  const [total, rawCerts] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      include: {
        student: { include: { class: true } },
        records: {
          include: {
            student: { include: { class: true } },
            session: { include: { subject: true, teacher: true, class: true } },
            certificate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  const items = rawCerts.map(formatCertificateRow);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, pageSize, pageCount };
}

export async function getCertificateById(id: string) {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { include: { class: true } },
      records: {
        include: {
          student: { include: { class: true } },
          session: { include: { subject: true, teacher: true, class: true } },
          certificate: true,
        },
      },
    },
  });

  if (!cert) throw new Error('Certificat introuvable.');
  return formatCertificateRow(cert);
}

export async function uploadCertificate(input: {
  studentId: string;
  absenceIds: string[];
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl?: string;
  startDate: string;
  endDate: string;
  uploadedByUserId?: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new Error('Étudiant introuvable.');

  const cert = await prisma.$transaction(async (tx) => {
    const created = await tx.certificate.create({
      data: {
        studentId: input.studentId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        dataUrl: input.dataUrl,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: CertificateStatus.PENDING,
        uploadedByUserId: input.uploadedByUserId || student.userId,
      },
    });

    if (input.absenceIds && input.absenceIds.length > 0) {
      await tx.attendanceRecord.updateMany({
        where: { id: { in: input.absenceIds } },
        data: { certificateId: created.id },
      });
    }

    return tx.certificate.findUnique({
      where: { id: created.id },
      include: {
        student: { include: { class: true } },
        records: {
          include: {
            student: { include: { class: true } },
            session: { include: { subject: true, teacher: true, class: true } },
            certificate: true,
          },
        },
      },
    });
  });

  await logActivity(
    'certificate_uploaded',
    `Certificat médical déposé par ${student.firstName} ${student.lastName}.`,
    input.uploadedByUserId || student.userId || student.id,
    [student.userId || student.id]
  );

  return formatCertificateRow(cert);
}

export async function reviewCertificate(
  id: string,
  decision: 'accepted' | 'rejected',
  note?: string,
  reviewerUserId?: string
) {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { student: true, records: true },
  });

  if (!cert) throw new Error('Certificat introuvable.');

  const statusEnum = decision === 'accepted' ? CertificateStatus.ACCEPTED : CertificateStatus.REJECTED;
  const attendanceStatus = decision === 'accepted' ? AttendanceStatus.JUSTIFIED : AttendanceStatus.ABSENT;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id },
      data: {
        status: statusEnum,
        reviewNote: note,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    await tx.attendanceRecord.updateMany({
      where: { certificateId: id },
      data: {
        status: attendanceStatus,
        note: note || (decision === 'accepted' ? 'Justifié par certificat médical' : 'Certificat médical refusé'),
      },
    });

    return tx.certificate.findUnique({
      where: { id },
      include: {
        student: { include: { class: true } },
        records: {
          include: {
            student: { include: { class: true } },
            session: { include: { subject: true, teacher: true, class: true } },
            certificate: true,
          },
        },
      },
    });
  });

  const kind = decision === 'accepted' ? 'certificate_accepted' : 'certificate_rejected';
  await logActivity(
    kind,
    `Certificat médical ${decision === 'accepted' ? 'validé' : 'refusé'} pour ${cert.student.firstName} ${cert.student.lastName}.`,
    reviewerUserId || 'admin',
    [cert.student.userId || cert.studentId]
  );

  return formatCertificateRow(updated);
}

export async function deleteCertificate(id: string) {
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) throw new Error('Certificat introuvable.');

  await prisma.attendanceRecord.updateMany({
    where: { certificateId: id },
    data: { certificateId: null },
  });

  await prisma.certificate.delete({ where: { id } });
  return true;
}
