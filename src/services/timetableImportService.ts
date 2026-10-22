import xlsx from 'xlsx';
import { DayOfWeek, TimetableVersionStatus } from '@prisma/client';
import prisma from '../config/database.js';
import { isTimeOverlap, isValidTimeFormat, timeToMinutes } from '../utils/dateUtils.js';

export interface ImportedRowPreview {
  line: number;
  rawRow: any;
  status: 'VALID' | 'ERROR';
  errors: string[];
  parsedData?: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    teacherId: string;
    teacherName: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    roomId: string;
    roomName: string;
  };
}

export function parseDayOfWeek(dayStr: string): DayOfWeek | null {
  if (!dayStr) return null;
  const upper = dayStr.trim().toUpperCase();
  const map: Record<string, DayOfWeek> = {
    MONDAY: DayOfWeek.MONDAY,
    MON: DayOfWeek.MONDAY,
    LUNDI: DayOfWeek.MONDAY,
    TUESDAY: DayOfWeek.TUESDAY,
    TUE: DayOfWeek.TUESDAY,
    MARDI: DayOfWeek.TUESDAY,
    WEDNESDAY: DayOfWeek.WEDNESDAY,
    WED: DayOfWeek.WEDNESDAY,
    MERCREDI: DayOfWeek.WEDNESDAY,
    THURSDAY: DayOfWeek.THURSDAY,
    THU: DayOfWeek.THURSDAY,
    JEUDI: DayOfWeek.THURSDAY,
    FRIDAY: DayOfWeek.FRIDAY,
    FRI: DayOfWeek.FRIDAY,
    VENDREDI: DayOfWeek.FRIDAY,
    SATURDAY: DayOfWeek.SATURDAY,
    SAT: DayOfWeek.SATURDAY,
    SAMEDI: DayOfWeek.SATURDAY,
    SUNDAY: DayOfWeek.SUNDAY,
    SUN: DayOfWeek.SUNDAY,
    DIMANCHE: DayOfWeek.SUNDAY,
  };
  return map[upper] || null;
}

export async function processTimetableImportFile(
  fileBuffer: Buffer,
  timetableVersionId: string
): Promise<{
  totalRows: number;
  validCount: number;
  errorCount: number;
  preview: ImportedRowPreview[];
}> {
  const version = await prisma.timetableVersion.findUnique({ where: { id: timetableVersionId } });
  if (!version) {
    throw new Error('Target Timetable Version not found');
  }

  // Read Excel/CSV Workbook
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Uploaded timetable file has no valid sheets');
  }
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('Uploaded timetable sheet is empty or corrupted');
  }
  const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Uploaded timetable file is empty');
  }

  // Pre-fetch reference entities from DB for fast in-memory matching
  const teachers = await prisma.teacher.findMany();
  const classes = await prisma.class.findMany();
  const subjects = await prisma.subject.findMany();
  const rooms = await prisma.room.findMany();
  const existingEntries = await prisma.timetableEntry.findMany({
    where: { timetableVersionId },
    include: { teacher: true, class: true, subject: true, room: true },
  });

  const previewResults: ImportedRowPreview[] = [];
  const validParsedRows: { line: number; data: NonNullable<ImportedRowPreview['parsedData']> }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const line = i + 2; // Row index (accounting for 1-based header)
    const errors: string[] = [];

    // Extract fields dynamically regardless of casing
    const dayVal = String(row.Day || row.day || row.DAY || '').trim();
    const startVal = String(row.Start || row.start || row.START || row.startTime || '').trim();
    const endVal = String(row.End || row.end || row.END || row.endTime || '').trim();
    const teacherVal = String(row.Teacher || row.teacher || row.TEACHER || '').trim();
    const classVal = String(row.Class || row.class || row.CLASS || '').trim();
    const subjectVal = String(row.Subject || row.subject || row.SUBJECT || '').trim();
    const roomVal = String(row.Room || row.room || row.ROOM || '').trim();

    // 1. Day of Week validation
    const dayOfWeek = parseDayOfWeek(dayVal);
    if (!dayOfWeek) {
      errors.push(`Invalid Day: '${dayVal}'`);
    }

    // 2. Time validation
    if (!isValidTimeFormat(startVal)) {
      errors.push(`Invalid Start Time: '${startVal}' (expected HH:mm)`);
    }
    if (!isValidTimeFormat(endVal)) {
      errors.push(`Invalid End Time: '${endVal}' (expected HH:mm)`);
    }
    if (isValidTimeFormat(startVal) && isValidTimeFormat(endVal)) {
      if (timeToMinutes(startVal) >= timeToMinutes(endVal)) {
        errors.push(`Start time (${startVal}) must be before end time (${endVal})`);
      }
    }

    // 3. Teacher matching
    let matchedTeacher = teachers.find(
      (t) =>
        t.teacherNumber.toLowerCase() === teacherVal.toLowerCase() ||
        `${t.firstName} ${t.lastName}`.toLowerCase() === teacherVal.toLowerCase() ||
        `${t.lastName} ${t.firstName}`.toLowerCase() === teacherVal.toLowerCase() ||
        t.firstName.toLowerCase() === teacherVal.toLowerCase() ||
        t.lastName.toLowerCase() === teacherVal.toLowerCase() ||
        t.email.toLowerCase() === teacherVal.toLowerCase()
    );
    if (!teacherVal) {
      errors.push('Missing Teacher value');
    } else if (!matchedTeacher) {
      errors.push(`Teacher '${teacherVal}' not found in system`);
    }

    // 4. Class matching
    let matchedClass = classes.find(
      (c) => c.name.toLowerCase() === classVal.toLowerCase() || c.code.toLowerCase() === classVal.toLowerCase()
    );
    if (!classVal) {
      errors.push('Missing Class value');
    } else if (!matchedClass) {
      errors.push(`Class '${classVal}' not found in system`);
    }

    // 5. Subject matching
    let matchedSubject = subjects.find(
      (s) => s.name.toLowerCase() === subjectVal.toLowerCase() || s.code.toLowerCase() === subjectVal.toLowerCase()
    );
    if (!subjectVal) {
      errors.push('Missing Subject value');
    } else if (!matchedSubject) {
      errors.push(`Subject '${subjectVal}' not found in system`);
    }

    // 6. Room matching
    let matchedRoom = rooms.find((r) => r.name.toLowerCase() === roomVal.toLowerCase());
    if (!roomVal) {
      errors.push('Missing Room value');
    } else if (!matchedRoom) {
      errors.push(`Room '${roomVal}' not found in system`);
    }

    if (errors.length > 0 || !dayOfWeek || !matchedTeacher || !matchedClass || !matchedSubject || !matchedRoom) {
      previewResults.push({
        line,
        rawRow: row,
        status: 'ERROR',
        errors,
      });
      continue;
    }

    const parsedData = {
      dayOfWeek,
      startTime: startVal,
      endTime: endVal,
      teacherId: matchedTeacher.id,
      teacherName: `${matchedTeacher.firstName} ${matchedTeacher.lastName}`,
      classId: matchedClass.id,
      className: matchedClass.name,
      subjectId: matchedSubject.id,
      subjectName: matchedSubject.name,
      roomId: matchedRoom.id,
      roomName: matchedRoom.name,
    };

    // 7. Check conflict against existing DB entries
    const dbConflicts = existingEntries.filter(
      (e) => e.dayOfWeek === dayOfWeek && isTimeOverlap(startVal, endVal, e.startTime, e.endTime)
    );

    for (const conflict of dbConflicts) {
      if (conflict.teacherId === matchedTeacher.id) {
        errors.push(`DB Conflict: Teacher ${matchedTeacher.firstName} already teaching ${conflict.class.name}`);
      }
      if (conflict.classId === matchedClass.id) {
        errors.push(`DB Conflict: Class ${matchedClass.name} already assigned to subject ${conflict.subject.name}`);
      }
      if (conflict.roomId === matchedRoom.id) {
        errors.push(`DB Conflict: Room ${matchedRoom.name} already occupied by class ${conflict.class.name}`);
      }
    }

    // 8. Check conflict against preceding valid rows in current file
    for (const prev of validParsedRows) {
      if (prev.data.dayOfWeek === dayOfWeek && isTimeOverlap(startVal, endVal, prev.data.startTime, prev.data.endTime)) {
        if (prev.data.teacherId === matchedTeacher.id) {
          errors.push(`File Overlap (Line ${prev.line}): Teacher ${matchedTeacher.firstName} assigned twice`);
        }
        if (prev.data.classId === matchedClass.id) {
          errors.push(`File Overlap (Line ${prev.line}): Class ${matchedClass.name} scheduled twice`);
        }
        if (prev.data.roomId === matchedRoom.id) {
          errors.push(`File Overlap (Line ${prev.line}): Room ${matchedRoom.name} used twice`);
        }
      }
    }

    if (errors.length > 0) {
      previewResults.push({
        line,
        rawRow: row,
        status: 'ERROR',
        errors,
      });
    } else {
      validParsedRows.push({ line, data: parsedData });
      previewResults.push({
        line,
        rawRow: row,
        status: 'VALID',
        errors: [],
        parsedData,
      });
    }
  }

  return {
    totalRows: rawRows.length,
    validCount: validParsedRows.length,
    errorCount: previewResults.length - validParsedRows.length,
    preview: previewResults,
  };
}

export async function confirmTimetableImport(
  timetableVersionId: string,
  entriesToInsert: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    roomId: string;
  }[]
) {
  const version = await prisma.timetableVersion.findUnique({ where: { id: timetableVersionId } });
  if (!version) {
    throw new Error('Target Timetable Version not found');
  }

  if (!entriesToInsert || entriesToInsert.length === 0) {
    throw new Error('No valid entries provided for import confirmation');
  }

  return prisma.$transaction(async (tx) => {
    const createdEntries = [];
    for (const item of entriesToInsert) {
      const entry = await tx.timetableEntry.create({
        data: {
          timetableVersionId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          teacherId: item.teacherId,
          classId: item.classId,
          subjectId: item.subjectId,
          roomId: item.roomId,
        },
      });
      createdEntries.push(entry);
    }
    return createdEntries;
  });
}
