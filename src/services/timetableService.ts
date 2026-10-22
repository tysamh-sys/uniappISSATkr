import prisma from '../config/database.js';
import { DayOfWeek, TimetableVersionStatus } from '@prisma/client';
import { isTimeOverlap, timeToMinutes } from '../utils/dateUtils.js';

export async function validateTimetableEntryConflicts(params: {
  timetableVersionId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  roomId: string;
  excludeEntryId?: string;
}) {
  const { timetableVersionId, dayOfWeek, startTime, endTime, teacherId, classId, subjectId, roomId, excludeEntryId } =
    params;

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new Error(`Start time (${startTime}) must be strictly before end time (${endTime})`);
  }

  // Query all entries in this timetable version for the target day of week
  const existingEntries = await prisma.timetableEntry.findMany({
    where: {
      timetableVersionId,
      dayOfWeek,
      id: excludeEntryId ? { not: excludeEntryId } : undefined,
    },
    include: {
      teacher: true,
      class: true,
      subject: true,
      room: true,
    },
  });

  for (const entry of existingEntries) {
    const isOverlap = isTimeOverlap(startTime, endTime, entry.startTime, entry.endTime);
    if (!isOverlap) continue;

    // 1. Teacher conflict check
    if (entry.teacherId === teacherId) {
      throw new Error(
        `Teacher Conflict: Teacher ${entry.teacher.firstName} ${entry.teacher.lastName} is already assigned to class ${entry.class.name} (${entry.startTime}-${entry.endTime}) on ${dayOfWeek}`
      );
    }

    // 2. Class conflict check
    if (entry.classId === classId) {
      throw new Error(
        `Class Conflict: Class ${entry.class.name} is already scheduled for ${entry.subject.name} with ${entry.teacher.firstName} ${entry.teacher.lastName} (${entry.startTime}-${entry.endTime}) on ${dayOfWeek}`
      );
    }

    // 3. Room conflict check
    if (entry.roomId === roomId) {
      throw new Error(
        `Room Conflict: Room ${entry.room.name} is already reserved for class ${entry.class.name} (${entry.startTime}-${entry.endTime}) on ${dayOfWeek}`
      );
    }
  }

  return true;
}

export async function getTimetableVersions() {
  return prisma.timetableVersion.findMany({
    include: {
      _count: { select: { entries: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTimetableVersion(data: {
  name: string;
  validFrom: string | Date;
  validUntil: string | Date;
  status?: TimetableVersionStatus;
}) {
  const from = new Date(data.validFrom);
  const until = new Date(data.validUntil);
  if (from >= until) {
    throw new Error('validFrom date must be strictly before validUntil date');
  }

  return prisma.timetableVersion.create({
    data: {
      name: data.name,
      validFrom: from,
      validUntil: until,
      status: data.status || TimetableVersionStatus.DRAFT,
    },
  });
}

export async function activateTimetableVersion(id: string) {
  const version = await prisma.timetableVersion.findUnique({ where: { id } });
  if (!version) {
    throw new Error('Timetable version not found');
  }

  return prisma.$transaction(async (tx) => {
    // Archive any currently active version
    await tx.timetableVersion.updateMany({
      where: { status: TimetableVersionStatus.ACTIVE },
      data: { status: TimetableVersionStatus.ARCHIVED },
    });

    // Set target version as ACTIVE
    return tx.timetableVersion.update({
      where: { id },
      data: { status: TimetableVersionStatus.ACTIVE },
    });
  });
}

export async function getTimetableEntries(filters?: {
  timetableVersionId?: string;
  teacherId?: string;
  classId?: string;
  dayOfWeek?: DayOfWeek;
  roomId?: string;
}) {
  const where: any = {};

  if (filters?.timetableVersionId) {
    where.timetableVersionId = filters.timetableVersionId;
  } else {
    // Default to ACTIVE timetable version
    const activeVersion = await prisma.timetableVersion.findFirst({
      where: { status: TimetableVersionStatus.ACTIVE },
    });
    if (activeVersion) {
      where.timetableVersionId = activeVersion.id;
    }
  }

  if (filters?.teacherId) where.teacherId = filters.teacherId;
  if (filters?.classId) where.classId = filters.classId;
  if (filters?.dayOfWeek) where.dayOfWeek = filters.dayOfWeek;
  if (filters?.roomId) where.roomId = filters.roomId;

  return prisma.timetableEntry.findMany({
    where,
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      class: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      room: { select: { id: true, name: true, building: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function createTimetableEntry(data: {
  timetableVersionId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  roomId: string;
}) {
  await validateTimetableEntryConflicts(data);

  return prisma.timetableEntry.create({
    data,
    include: {
      teacher: true,
      class: true,
      subject: true,
      room: true,
    },
  });
}

export async function updateTimetableEntry(
  id: string,
  data: Partial<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    roomId: string;
  }>
) {
  const existing = await prisma.timetableEntry.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Timetable entry not found');
  }

  const merged = {
    timetableVersionId: existing.timetableVersionId,
    dayOfWeek: data.dayOfWeek || existing.dayOfWeek,
    startTime: data.startTime || existing.startTime,
    endTime: data.endTime || existing.endTime,
    teacherId: data.teacherId || existing.teacherId,
    classId: data.classId || existing.classId,
    subjectId: data.subjectId || existing.subjectId,
    roomId: data.roomId || existing.roomId,
    excludeEntryId: id,
  };

  await validateTimetableEntryConflicts(merged);

  return prisma.timetableEntry.update({
    where: { id },
    data,
    include: {
      teacher: true,
      class: true,
      subject: true,
      room: true,
    },
  });
}

export async function deleteTimetableEntry(id: string) {
  const existing = await prisma.timetableEntry.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Timetable entry not found');
  }

  return prisma.timetableEntry.delete({ where: { id } });
}
