import prisma from '../config/database.js';
import { AttendanceSessionStatus, AttendanceStatus, DayOfWeek, RequestStatus, TimetableVersionStatus } from '@prisma/client';
import { getDayOfWeekFromDate, normalizeDate, formatDateToYYYYMMDD, timeToMinutes } from '../utils/dateUtils.js';

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatFrenchDate(date: Date): string {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES_FR[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${dayName} ${dayNum} ${monthName} ${year}`;
}

function formatShortDate(date: Date): string {
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES_FR[date.getMonth()] || '';
  return `${dayNum} ${monthName}`;
}

export async function getTeacherDashboard(teacherId: string, dateInput?: Date | string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!teacher) {
    throw new Error('Fiche enseignant introuvable.');
  }

  const targetDate = normalizeDate(dateInput);
  const dayOfWeek = getDayOfWeekFromDate(targetDate);

  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  const entries = activeVersion
    ? await prisma.timetableEntry.findMany({
        where: {
          teacherId,
          timetableVersionId: activeVersion.id,
          dayOfWeek,
        },
        include: {
          class: { select: { id: true, name: true, code: true, _count: { select: { students: true } } } },
          subject: true,
          room: true,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      teacherId,
      date: targetDate,
    },
  });

  const sessionMap = new Map(sessions.map((s) => [s.timetableEntryId, s]));

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedClasses = entries.map((entry) => {
    const session = entry.id ? sessionMap.get(entry.id) : undefined;
    const startMins = timeToMinutes(entry.startTime);
    const endMins = timeToMinutes(entry.endTime);

    const isCurrent = currentMinutes >= startMins && currentMinutes <= endMins;
    const isUpcoming = currentMinutes < startMins;

    let status = 'À venir';
    let tone: 'success' | 'warning' | 'neutral' | 'info' = 'neutral';

    if (session && session.status === AttendanceSessionStatus.SUBMITTED) {
      status = 'Enregistrée';
      tone = 'success';
    } else if (isCurrent || (!isUpcoming && (!session || session.status !== AttendanceSessionStatus.SUBMITTED))) {
      status = 'À enregistrer';
      tone = 'warning';
    }

    return {
      timetableEntryId: entry.id,
      sessionId: session?.id || null,
      time: entry.startTime,
      end: entry.endTime,
      subject: entry.subject.name,
      subjectCode: entry.subject.code,
      meta: `${entry.room.name} · ${entry.class.name}`,
      room: entry.room.name,
      className: entry.class.name,
      totalStudents: entry.class._count.students,
      status,
      tone,
      current: isCurrent,
      startMinutes: startMins,
    };
  });

  // Highlight next class
  let nextClass = formattedClasses.find((c) => c.current);
  if (!nextClass) {
    nextClass = formattedClasses.find((c) => c.startMinutes > currentMinutes);
  }
  if (!nextClass && formattedClasses.length > 0) {
    nextClass = formattedClasses[0];
  }

  let nextCountdown = 'À venir';
  if (nextClass) {
    const diff = nextClass.startMinutes - currentMinutes;
    if (nextClass.current) {
      nextCountdown = 'En cours';
    } else if (diff > 0 && diff <= 60) {
      nextCountdown = `Dans ${diff} min`;
    } else if (diff > 60) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      nextCountdown = `Dans ${h}h${m > 0 ? m : ''}`;
    }
  }

  // Count pending administrative requests
  const pendingRequestsCount = await prisma.administrativeRequest.count({
    where: { teacherId, status: RequestStatus.PENDING },
  });

  const unreadCount = teacher.userId
    ? await prisma.notification.count({
        where: { userId: teacher.userId, isRead: false },
      })
    : 0;

  return {
    teacher: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: `Mme. ${teacher.lastName}`,
      department: teacher.department || 'Département Informatique',
      email: teacher.email || teacher.user?.email,
      phone: teacher.phone,
    },
    today: {
      dateFormatted: formatFrenchDate(targetDate),
      dateIso: formatDateToYYYYMMDD(targetDate),
      classesCount: formattedClasses.length,
    },
    nextClass: nextClass
      ? {
          timetableEntryId: nextClass.timetableEntryId,
          sessionId: nextClass.sessionId,
          subject: nextClass.subject,
          subjectCode: nextClass.subjectCode,
          time: nextClass.time,
          end: nextClass.end,
          meta: nextClass.meta,
          countdown: nextCountdown,
        }
      : null,
    classes: formattedClasses,
    pendingRequestsCount,
    unreadNotifications: unreadCount,
  };
}

export async function getTeacherSessionRoster(sessionIdOrTimetableEntryId: string, teacherId: string) {
  let session = await prisma.attendanceSession.findUnique({
    where: { id: sessionIdOrTimetableEntryId },
    include: {
      class: {
        include: {
          students: {
            where: { isActive: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          },
        },
      },
      subject: true,
      room: true,
      records: true,
    },
  });

  // If passed a timetableEntryId instead of an existing sessionId
  if (!session) {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: sessionIdOrTimetableEntryId },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true },
              orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            },
          },
        },
        subject: true,
        room: true,
      },
    });

    if (!entry) {
      throw new Error('Séance ou cours introuvable.');
    }

    if (entry.teacherId !== teacherId) {
      throw new Error('Vous n’êtes pas autorisé à gérer les présences de ce cours.');
    }

    const today = normalizeDate();
    // Generate reference ATT-YYMMDD-XXX
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    const reference = `ATT-${yy}${mm}${dd}-${rand}`;

    session = await prisma.attendanceSession.upsert({
      where: {
        timetableEntryId_date: {
          timetableEntryId: entry.id,
          date: today,
        },
      },
      update: {},
      create: {
        reference,
        timetableEntryId: entry.id,
        date: today,
        teacherId,
        classId: entry.classId,
        subjectId: entry.subjectId,
        roomId: entry.roomId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: AttendanceSessionStatus.OPEN,
      },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true },
              orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            },
          },
        },
        subject: true,
        room: true,
        records: true,
      },
    });
  }

  const recordMap = new Map(session.records.map((r) => [r.studentId, r]));

  const roster = session.class.students.map((st, index) => {
    const record = recordMap.get(st.id);
    const initials = `${st.firstName[0] || ''}${st.lastName[0] || ''}`.toUpperCase();
    return {
      index,
      studentId: st.id,
      name: `${st.firstName} ${st.lastName}`,
      studentCode: st.studentNumber,
      initials,
      status: record
        ? record.status === AttendanceStatus.PRESENT
          ? 'present'
          : 'absent'
        : ('present' as const),
    };
  });

  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;

  return {
    sessionId: session.id,
    reference: session.reference,
    subject: session.subject.name,
    subjectCode: session.subject.code,
    classGroup: session.class.name,
    room: session.room.name,
    timeSlot: `${session.startTime} – ${session.endTime}`,
    date: formatShortDate(session.date),
    status: session.status,
    allMarked: roster.length > 0,
    presentCount,
    absentCount,
    totalStudents: roster.length,
    students: roster,
  };
}

export async function submitTeacherRollCall(
  sessionId: string,
  teacherId: string,
  records: { studentId: string; status: 'present' | 'absent' }[]
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      subject: true,
      teacher: true,
    },
  });

  if (!session) {
    throw new Error('Séance d’appel introuvable.');
  }

  if (session.teacherId !== teacherId) {
    throw new Error('Action non autorisée sur cette séance.');
  }

  // Generate reference if not present: ATT-YYMMDD-XXX
  let reference = session.reference;
  if (!reference) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    reference = `ATT-${yy}${mm}${dd}-${rand}`;
  }

  // Upsert attendance records
  let presentCount = 0;
  let absentCount = 0;

  for (const rec of records) {
    const isPresent = rec.status === 'present';
    if (isPresent) presentCount++;
    else absentCount++;

    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: rec.studentId,
        },
      },
      update: {
        status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
        remarks: isPresent ? 'Présent au roll-call' : 'Marqué absent lors du cours',
      },
      create: {
        sessionId: session.id,
        studentId: rec.studentId,
        status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
        remarks: isPresent ? 'Présent au roll-call' : 'Marqué absent lors du cours',
      },
    });
  }

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      reference,
      status: AttendanceSessionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  // Notify teacher of successful confirmation
  if (session.teacher.userId) {
    await prisma.notification.create({
      data: {
        userId: session.teacher.userId,
        title: 'Présences validées',
        message: `La feuille de présence réf. ${reference} (${session.subject.name} · ${session.class.name}) a été confirmée avec succès.`,
        type: 'attendance',
        icon: 'check',
        isRead: false,
      },
    });
  }

  const now = new Date();
  return {
    reference,
    sessionId: updatedSession.id,
    status: 'Confirmé',
    date: `${formatShortDate(now)}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    presentCount,
    absentCount,
    totalStudents: records.length,
    subject: session.subject.name,
    classGroup: session.class.name,
  };
}

export async function createTeacherAnnouncement(
  teacherId: string,
  input: {
    classId?: string;
    className?: string;
    subjectId?: string;
    title: string;
    message: string;
  }
) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    throw new Error('Fiche enseignant introuvable.');
  }

  let classId = input.classId;
  if (!classId && input.className) {
    const cls = await prisma.class.findFirst({ where: { name: input.className } });
    if (cls) classId = cls.id;
  }

  // If no class specified, use teacher's primary class
  if (!classId) {
    const entry = await prisma.timetableEntry.findFirst({
      where: { teacherId },
    });
    classId = entry?.classId;
  }

  const announcement = await prisma.announcement.create({
    data: {
      teacherId,
      classId,
      subjectId: input.subjectId,
      title: input.title,
      message: input.message,
    },
    include: {
      class: {
        include: {
          students: {
            where: { isActive: true },
            include: { user: true },
          },
        },
      },
      subject: true,
    },
  });

  // Notify students in class
  const students = announcement.class?.students || [];
  for (const st of students) {
    if (st.userId) {
      await prisma.notification.create({
        data: {
          userId: st.userId,
          title: announcement.title,
          message: announcement.message,
          type: 'announcement',
          icon: 'megaphone',
          isRead: false,
        },
      });
    }
  }

  return {
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    group: announcement.class?.name || 'Tous',
    studentCount: students.length,
    notifiedCount: students.length,
    createdAt: announcement.createdAt.toISOString(),
  };
}

export async function submitAdministrativeRequest(
  teacherId: string,
  input: {
    type: string;
    date: string | Date;
    reason: string;
  }
) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    throw new Error('Fiche enseignant introuvable.');
  }

  // Generate reference: REQ-XXXX
  const rand = Math.floor(1000 + Math.random() * 9000);
  const reference = `REQ-${rand}`;

  const request = await prisma.administrativeRequest.create({
    data: {
      reference,
      teacherId,
      type: input.type,
      date: new Date(input.date),
      reason: input.reason,
      status: RequestStatus.PENDING,
    },
  });

  // Notification for teacher
  if (teacher.userId) {
    await prisma.notification.create({
      data: {
        userId: teacher.userId,
        title: 'Mise à jour administrative',
        message: `Votre demande réf. ${reference} (${input.type}) a été transmise au département.`,
        type: 'admin',
        icon: 'check',
        isRead: false,
      },
    });
  }

  return {
    id: request.id,
    reference: request.reference,
    type: request.type,
    date: formatFrenchDate(request.date),
    reason: request.reason,
    status: 'En examen',
    tone: 'warning' as const,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function getTeacherAdministrativeRequests(teacherId: string) {
  const requests = await prisma.administrativeRequest.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => {
    let label = 'En examen';
    let tone: 'warning' | 'success' | 'danger' = 'warning';

    if (req.status === RequestStatus.APPROVED) {
      label = 'Approuvée';
      tone = 'success';
    } else if (req.status === RequestStatus.REJECTED) {
      label = 'Rejetée';
      tone = 'danger';
    }

    return {
      id: req.id,
      reference: req.reference,
      type: req.type,
      date: formatFrenchDate(req.date),
      submittedDate: formatShortDate(req.createdAt),
      reason: req.reason,
      status: label,
      tone,
      statusCode: req.status,
      reviewNote: req.reviewNote,
      reviewedAt: req.reviewedAt?.toISOString() || null,
      createdAt: req.createdAt.toISOString(),
    };
  });
}
