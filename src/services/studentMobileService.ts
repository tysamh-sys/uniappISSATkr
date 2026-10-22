import prisma from '../config/database.js';
import { AttendanceStatus, DayOfWeek, TimetableVersionStatus, CertificateStatus } from '@prisma/client';
import { getDayOfWeekFromDate, normalizeDate, formatDateToYYYYMMDD, timeToMinutes } from '../utils/dateUtils.js';

const DAY_NAMES_FR: Record<DayOfWeek, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche',
};

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatFrenchDate(date: Date): string {
  const dayName = DAY_NAMES_FR[getDayOfWeekFromDate(date)] || '';
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

export async function getStudentDashboard(studentId: string, dateInput?: Date | string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      user: { select: { id: true, email: true } },
    },
  });

  if (!student) {
    throw new Error('Fiche étudiant introuvable.');
  }

  const targetDate = normalizeDate(dateInput);
  const dayOfWeek = getDayOfWeekFromDate(targetDate);

  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  // Timetable entries for student's class today
  const entries = activeVersion
    ? await prisma.timetableEntry.findMany({
        where: {
          classId: student.classId,
          timetableVersionId: activeVersion.id,
          dayOfWeek,
        },
        include: {
          subject: true,
          room: true,
          teacher: true,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

  // Attendance sessions for today
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      classId: student.classId,
      date: targetDate,
    },
    include: {
      records: {
        where: { studentId },
      },
    },
  });

  const sessionMap = new Map(sessions.map((s) => [s.timetableEntryId, s]));

  // Unread announcements / notifications for this student
  const unreadAnnouncements = await prisma.announcement.findMany({
    where: {
      classId: student.classId,
      reads: { none: { studentId } },
    },
    select: { subjectId: true },
  });
  const unreadSubjectIds = new Set(unreadAnnouncements.map((a) => a.subjectId));

  // Determine current time
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedClasses = entries.map((entry) => {
    const session = entry.id ? sessionMap.get(entry.id) : undefined;
    const record = session?.records?.[0];

    const startMins = timeToMinutes(entry.startTime);
    const endMins = timeToMinutes(entry.endTime);

    const isCurrent = currentMinutes >= startMins && currentMinutes <= endMins;
    const isUpcoming = currentMinutes < startMins;

    let status = 'À venir';
    let tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' = 'neutral';

    if (record) {
      if (record.status === AttendanceStatus.PRESENT) {
        status = 'Présent';
        tone = 'success';
      } else if (record.status === AttendanceStatus.JUSTIFIED) {
        status = 'Absence justifiée';
        tone = 'info';
      } else if (record.status === AttendanceStatus.ABSENT) {
        if (record.certificateId) {
          status = 'En attente';
          tone = 'warning';
        } else {
          status = 'Absent';
          tone = 'danger';
        }
      }
    } else if (isCurrent) {
      status = 'En cours';
      tone = 'info';
    } else if (!isUpcoming && session) {
      status = 'Non enregistré';
      tone = 'warning';
    }

    return {
      timetableEntryId: entry.id,
      sessionId: session?.id || null,
      time: entry.startTime,
      end: entry.endTime,
      subject: entry.subject.name,
      subjectCode: entry.subject.code,
      meta: `${entry.room.name} · ${entry.teacher.firstName} ${entry.teacher.lastName}`,
      room: entry.room.name,
      teacher: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
      status,
      tone,
      current: isCurrent,
      unread: entry.subjectId ? unreadSubjectIds.has(entry.subjectId) : false,
      startMinutes: startMins,
    };
  });

  // Identify next class highlight
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

  const unreadCount = student.userId
    ? await prisma.notification.count({
        where: { userId: student.userId, isRead: false },
      })
    : 0;

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      studentNumber: student.studentNumber,
      filiere: student.filiere,
      niveau: student.niveau,
      groupe: student.groupe,
      className: student.class.name,
      email: student.email || student.user?.email,
    },
    today: {
      dateFormatted: formatFrenchDate(targetDate),
      dateIso: formatDateToYYYYMMDD(targetDate),
      dayOfWeek,
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
    unreadNotifications: unreadCount,
  };
}

export async function getStudentTimetable(studentId: string, dayOrDate?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student) {
    throw new Error('Fiche étudiant introuvable.');
  }

  const activeVersion = await prisma.timetableVersion.findFirst({
    where: { status: TimetableVersionStatus.ACTIVE },
  });

  if (!activeVersion) {
    return { days: [], classes: [] };
  }

  // If a specific day name or date is requested
  let targetDay: DayOfWeek | undefined;
  let targetDate: Date = normalizeDate();

  if (dayOrDate) {
    const upper = dayOrDate.toUpperCase();
    if (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(upper)) {
      targetDay = upper as DayOfWeek;
    } else if (dayOrDate.includes('-')) {
      targetDate = normalizeDate(dayOrDate);
      targetDay = getDayOfWeekFromDate(targetDate);
    }
  } else {
    targetDay = getDayOfWeekFromDate(targetDate);
  }

  const entries = await prisma.timetableEntry.findMany({
    where: {
      classId: student.classId,
      timetableVersionId: activeVersion.id,
      ...(targetDay ? { dayOfWeek: targetDay } : {}),
    },
    include: {
      subject: true,
      room: true,
      teacher: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const formatted = entries.map((entry) => ({
    timetableEntryId: entry.id,
    dayOfWeek: entry.dayOfWeek,
    time: entry.startTime,
    end: entry.endTime,
    subject: entry.subject.name,
    subjectCode: entry.subject.code,
    meta: `${entry.room.name} · ${entry.teacher.firstName} ${entry.teacher.lastName}`,
    room: entry.room.name,
    teacher: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
    status: 'Programmé',
    tone: 'neutral' as const,
  }));

  return {
    className: student.class.name,
    selectedDay: targetDay,
    classes: formatted,
  };
}

export async function getStudentAttendanceSummaryAndRecords(studentId: string, filter?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student) {
    throw new Error('Fiche étudiant introuvable.');
  }

  // Fetch all attendance records for this student
  const allRecords = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: {
      session: {
        include: {
          subject: true,
          room: true,
          teacher: true,
        },
      },
      certificate: true,
      absenceReason: true,
    },
    orderBy: {
      session: {
        date: 'desc',
      },
    },
  });

  // Calculate stats
  let presentCount = 0;
  let absentCount = 0;
  let justifiedCount = 0;
  let pendingCount = 0;

  const recordsList = allRecords.map((r) => {
    let statusLabel = 'Présent';
    let tone: 'success' | 'danger' | 'info' | 'warning' = 'success';
    let recType: 'present' | 'absent' | 'pending' = 'present';

    if (r.status === AttendanceStatus.PRESENT) {
      presentCount++;
      statusLabel = 'Présent';
      tone = 'success';
      recType = 'present';
    } else if (r.status === AttendanceStatus.JUSTIFIED) {
      absentCount++;
      justifiedCount++;
      statusLabel = 'Absence justifiée';
      tone = 'info';
      recType = 'absent';
    } else if (r.status === AttendanceStatus.ABSENT) {
      absentCount++;
      if (r.certificate && r.certificate.status === CertificateStatus.PENDING) {
        pendingCount++;
        statusLabel = 'En attente';
        tone = 'warning';
        recType = 'pending';
      } else {
        statusLabel = 'Absent';
        tone = 'danger';
        recType = 'absent';
      }
    }

    return {
      id: r.id,
      sessionId: r.sessionId,
      date: formatShortDate(r.session.date),
      fullDate: r.session.date.toISOString(),
      timeSlot: `${r.session.startTime}–${r.session.endTime}`,
      subject: r.session.subject.name,
      room: r.session.room.name,
      teacher: `${r.session.teacher.firstName} ${r.session.teacher.lastName}`,
      status: statusLabel,
      tone,
      type: recType,
      certificateReference: r.certificate?.reference || null,
      certificateStatus: r.certificate?.status || null,
      remarks: r.remarks,
    };
  });

  // Filter records
  const filtered = recordsList.filter((r) => {
    if (filter === 'Absences') return r.type === 'absent';
    if (filter === 'En attente' || filter === 'pending') return r.type === 'pending';
    return true;
  });

  return {
    summary: {
      presences: presentCount,
      absences: absentCount,
      justified: justifiedCount,
      pending: pendingCount,
    },
    records: filtered,
    totalRecords: recordsList.length,
  };
}

export async function submitStudentJustification(
  studentId: string,
  input: {
    recordId?: string;
    sessionId?: string;
    fileData?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    medicalCenter?: string;
    reason?: string;
    startDate?: string | Date;
    endDate?: string | Date;
  }
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student) {
    throw new Error('Fiche étudiant introuvable.');
  }

  // Generate unique receipt reference: JUS-YYMMDD-XXX
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  const reference = `JUS-${yy}${mm}${dd}-${rand}`;

  const start = input.startDate ? new Date(input.startDate) : now;
  const end = input.endDate ? new Date(input.endDate) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const cert = await prisma.certificate.create({
    data: {
      reference,
      studentId: student.id,
      fileName: input.fileName || 'certificat_medical_mobile.jpg',
      fileType: input.fileType || 'image/jpeg',
      fileSize: input.fileSize || 64000,
      dataUrl: input.fileData,
      medicalCenter: input.medicalCenter || 'Centre Médical Universitaire',
      reason: input.reason || 'Certificat médical transmis via application mobile',
      startDate: start,
      endDate: end,
      status: CertificateStatus.PENDING,
      uploadedByUserId: student.userId,
    },
  });

  // Link to record if recordId or sessionId provided
  if (input.recordId) {
    await prisma.attendanceRecord.update({
      where: { id: input.recordId },
      data: { certificateId: cert.id },
    });
  } else if (input.sessionId) {
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: input.sessionId,
          studentId: student.id,
        },
      },
    });
    if (existingRecord) {
      await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: { certificateId: cert.id },
      });
    }
  }

  // Notify student
  if (student.userId) {
    await prisma.notification.create({
      data: {
        userId: student.userId,
        title: 'Justificatif enregistré',
        message: `Votre justificatif réf. ${reference} a été transmis au département et est en cours d’examen.`,
        type: 'certificate',
        icon: 'file',
        isRead: false,
      },
    });
  }

  return {
    reference: cert.reference,
    id: cert.id,
    status: 'En examen',
    statusCode: cert.status,
    date: formatFrenchDate(now),
    dateIso: now.toISOString(),
    receipt: {
      reference: cert.reference,
      status: 'En examen',
      date: `${formatShortDate(now)}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      medicalCenter: cert.medicalCenter,
      fileName: cert.fileName,
    },
  };
}

export async function getCourseDetailsForStudent(studentId: string, courseIdOrSessionId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student) {
    throw new Error('Fiche étudiant introuvable.');
  }

  // Look up by sessionId or timetableEntryId
  let session = await prisma.attendanceSession.findUnique({
    where: { id: courseIdOrSessionId },
    include: {
      subject: true,
      room: true,
      teacher: true,
      class: true,
      records: { where: { studentId } },
    },
  });

  if (!session) {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: courseIdOrSessionId },
      include: {
        subject: true,
        room: true,
        teacher: true,
        class: true,
      },
    });

    if (entry) {
      const today = normalizeDate();
      session = await prisma.attendanceSession.findFirst({
        where: { timetableEntryId: entry.id, date: today },
        include: {
          subject: true,
          room: true,
          teacher: true,
          class: true,
          records: { where: { studentId } },
        },
      });
    }
  }

  const record = session?.records?.[0];
  let attendanceStatus = 'Pas encore enregistrée';
  let tone: 'success' | 'warning' | 'info' | 'danger' = 'warning';

  if (record) {
    if (record.status === AttendanceStatus.PRESENT) {
      attendanceStatus = 'Présent';
      tone = 'success';
    } else if (record.status === AttendanceStatus.JUSTIFIED) {
      attendanceStatus = 'Absence justifiée';
      tone = 'info';
    } else if (record.status === AttendanceStatus.ABSENT) {
      attendanceStatus = record.certificateId ? 'En attente' : 'Absent';
      tone = record.certificateId ? 'warning' : 'danger';
    }
  }

  // Fetch course announcement
  const announcement = await prisma.announcement.findFirst({
    where: {
      classId: student.classId,
      ...(session ? { subjectId: session.subjectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    subject: session?.subject.name || 'Cours',
    code: session?.subject.code?.slice(0, 2) || 'RI',
    class: session?.class.name || student.class.name,
    teacher: session ? `${session.teacher.firstName} ${session.teacher.lastName}` : 'Enseignant',
    room: session?.room.name || 'Salle de cours',
    timeSlot: session ? `${session.startTime} – ${session.endTime}` : '08:30 – 10:00',
    attendanceStatus,
    tone,
    announcement: announcement
      ? {
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          time: 'Aujourd’hui',
          unread: true,
        }
      : null,
  };
}
