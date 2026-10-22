import prisma from '../config/database.js';

export async function getAnnouncementsForUser(userId: string, role: string, studentId?: string, teacherId?: string) {
  if (role === 'STUDENT' && studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) return [];

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { classId: student.classId },
          { classId: null },
        ],
      },
      include: {
        teacher: true,
        subject: true,
        class: true,
        reads: {
          where: { studentId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      author: `${a.teacher.firstName} ${a.teacher.lastName}`,
      className: a.class?.name || 'Tous',
      subjectName: a.subject?.name || null,
      unread: a.reads.length === 0,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  if (role === 'TEACHER' && teacherId) {
    const announcements = await prisma.announcement.findMany({
      where: { teacherId },
      include: {
        class: true,
        subject: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      className: a.class?.name || 'Tous',
      subjectName: a.subject?.name || null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  return prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { teacher: true, class: true, subject: true },
  });
}

export async function markAnnouncementAsRead(announcementId: string, studentId: string) {
  return prisma.announcementRead.upsert({
    where: {
      announcementId_studentId: {
        announcementId,
        studentId,
      },
    },
    update: { readAt: new Date() },
    create: {
      announcementId,
      studentId,
    },
  });
}
