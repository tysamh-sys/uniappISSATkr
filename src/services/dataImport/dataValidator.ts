import xlsx from 'xlsx';
import { DayOfWeek } from '@prisma/client';
import prisma from '../../config/database.js';
import { ENTITY_DEFINITIONS } from './fieldDefinitions.js';
import {
  EntityPreviewItem,
  ImportEntityType,
  ImportPreviewResponse,
  RowValidationError,
  SheetMappingConfig,
  SheetValidationResult,
} from './types.js';
import { parseDayOfWeek } from '../timetableImportService.js';
import { isValidTimeFormat, timeToMinutes, isTimeOverlap } from '../../utils/dateUtils.js';

/**
 * Splits a full name like "BEN SALEM Mohamed" or "Mohamed Ben Salem" into firstName & lastName
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  // If first token is ALL CAPS (common in French/Tunisian names e.g. "BEN SALEM Mohamed")
  if (parts[0] === parts[0].toUpperCase() && parts.length > 1) {
    const lastName = parts.slice(0, parts.length - 1).join(' ');
    const firstName = parts[parts.length - 1];
    return { firstName, lastName };
  }
  // Otherwise first token is firstName, rest is lastName
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Parses a time slot range like "08:30-10:00" or "08:30 - 10:00"
 */
export function parseTimeSlot(slotStr: string): { startTime: string; endTime: string } | null {
  if (!slotStr) return null;
  const match = slotStr.match(/(\d{1,2}[:h]\d{2})\s*[-–—àa]\s*(\d{1,2}[:h]\d{2})/i);
  if (!match) return null;
  const start = match[1].replace(/[hH]/, ':').padStart(5, '0');
  const end = match[2].replace(/[hH]/, ':').padStart(5, '0');
  return { startTime: start, endTime: end };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface TrackedTimetableSession {
  line: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherRef: string;
  teacherName: string;
  roomRef: string;
  roomName: string;
  classRef: string;
  className: string;
  subjectName: string;
}

/**
 * Validates mapped data against database and inter-sheet relations, producing an actionable preview
 * with duplicate diff comparisons and strict timetable integrity conflict detection.
 */
export async function validateImportData(
  fileBuffer: Buffer,
  sheetConfigs: SheetMappingConfig[]
): Promise<ImportPreviewResponse> {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });

  // 1. Pre-fetch reference records from DB for conflict & dependency checks
  const [
    existingClasses,
    existingTeachers,
    existingSubjects,
    existingRooms,
    existingStudents,
    existingTimetables,
  ] = await Promise.all([
    prisma.class.findMany(),
    prisma.teacher.findMany({ include: { user: true } }),
    prisma.subject.findMany(),
    prisma.room.findMany(),
    prisma.student.findMany({ include: { class: true } }),
    prisma.timetableEntry.findMany({
      include: { teacher: true, room: true, class: true, subject: true },
    }),
  ]);

  // Set up lookup collections
  const dbClassMap = new Map<string, any>();
  existingClasses.forEach((c) => {
    dbClassMap.set(c.name.toLowerCase(), c);
    dbClassMap.set(c.code.toLowerCase(), c);
  });

  const dbStudentNumMap = new Map<string, any>();
  const dbStudentEmailMap = new Map<string, any>();
  existingStudents.forEach((s) => {
    dbStudentNumMap.set(s.studentNumber.toLowerCase(), s);
    if (s.email) {
      dbStudentEmailMap.set(s.email.toLowerCase(), s);
    }
  });

  const dbTeacherNumMap = new Map<string, any>();
  const dbTeacherEmailMap = new Map<string, any>();
  const dbTeacherNameMap = new Map<string, any>();
  existingTeachers.forEach((t) => {
    dbTeacherNumMap.set(t.teacherNumber.toLowerCase(), t);
    dbTeacherEmailMap.set(t.email.toLowerCase(), t);
    dbTeacherNameMap.set(`${t.firstName} ${t.lastName}`.toLowerCase(), t);
    dbTeacherNameMap.set(`${t.lastName} ${t.firstName}`.toLowerCase(), t);
    dbTeacherNameMap.set(t.lastName.toLowerCase(), t);
  });

  const dbSubjectMap = new Map<string, any>();
  existingSubjects.forEach((s) => {
    dbSubjectMap.set(s.code.toLowerCase(), s);
    dbSubjectMap.set(s.name.toLowerCase(), s);
  });

  const dbRoomMap = new Map<string, any>();
  existingRooms.forEach((r) => {
    dbRoomMap.set(r.name.toLowerCase(), r);
  });

  // Inter-sheet exported identifiers (so classes imported in Sheet A can satisfy students in Sheet B)
  const fileProvidedClasses = new Set<string>();
  const fileProvidedTeachers = new Set<string>();
  const fileProvidedSubjects = new Set<string>();
  const fileProvidedRooms = new Set<string>();

  // First pass: register identifiers that will be created in this file
  for (const config of sheetConfigs) {
    const worksheet = workbook.Sheets[config.sheetName];
    if (!worksheet) continue;
    const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (config.entityType === 'CLASS') {
      const colName = config.columnMappings.name;
      const colCode = config.columnMappings.code;
      rawRows.forEach((r) => {
        if (colName && r[colName]) fileProvidedClasses.add(String(r[colName]).trim().toLowerCase());
        if (colCode && r[colCode]) fileProvidedClasses.add(String(r[colCode]).trim().toLowerCase());
      });
    } else if (config.entityType === 'TEACHER') {
      const colNum = config.columnMappings.teacherNumber;
      const colFull = config.columnMappings.fullName;
      rawRows.forEach((r) => {
        if (colNum && r[colNum]) fileProvidedTeachers.add(String(r[colNum]).trim().toLowerCase());
        if (colFull && r[colFull]) fileProvidedTeachers.add(String(r[colFull]).trim().toLowerCase());
      });
    } else if (config.entityType === 'SUBJECT') {
      const colCode = config.columnMappings.code;
      const colName = config.columnMappings.name;
      rawRows.forEach((r) => {
        if (colCode && r[colCode]) fileProvidedSubjects.add(String(r[colCode]).trim().toLowerCase());
        if (colName && r[colName]) fileProvidedSubjects.add(String(r[colName]).trim().toLowerCase());
      });
    } else if (config.entityType === 'ROOM') {
      const colName = config.columnMappings.name;
      rawRows.forEach((r) => {
        if (colName && r[colName]) fileProvidedRooms.add(String(r[colName]).trim().toLowerCase());
      });
    }
  }

  // Second pass: full row-by-row validation & timetable conflict tracking
  const sheetResults: SheetValidationResult[] = [];
  const entitiesDetected = new Set<ImportEntityType>();

  const neededClasses = new Set<string>();
  const neededTeachers = new Set<string>();
  const neededSubjects = new Set<string>();
  const neededRooms = new Set<string>();
  const unresolvedDependencies = new Set<string>();

  // In-file timetable session tracker to catch overlaps within the imported file itself
  const trackedFileTimetables: TrackedTimetableSession[] = [];

  let grandTotal = 0;
  let grandValid = 0;
  let grandWarning = 0;
  let grandError = 0;
  let grandDuplicate = 0;

  for (const config of sheetConfigs) {
    const worksheet = workbook.Sheets[config.sheetName];
    if (!worksheet) continue;

    entitiesDetected.add(config.entityType);
    const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    const entityDef = ENTITY_DEFINITIONS[config.entityType];

    const previewRows: EntityPreviewItem[] = [];
    const fieldErrors: RowValidationError[] = [];
    const inSheetSeenKeys = new Set<string>();

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let missingRequiredCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const line = i + 2; // 1-based, accounting for header
      const raw = rawRows[i];
      const parsed: Record<string, any> = {};
      const errors: string[] = [];
      const warnings: string[] = [];
      let diff: EntityPreviewItem['diff'] = undefined;

      // Map fields according to config
      for (const field of entityDef.fields) {
        const colHeader = config.columnMappings[field.key];
        const val = colHeader && raw[colHeader] !== undefined ? String(raw[colHeader]).trim() : '';
        parsed[field.key] = val;
      }

      // Check for composite fields (e.g. fullName -> firstName + lastName)
      if (parsed.fullName && (!parsed.firstName || !parsed.lastName)) {
        const split = splitFullName(parsed.fullName);
        if (!parsed.firstName) parsed.firstName = split.firstName;
        if (!parsed.lastName) parsed.lastName = split.lastName;
      } else if (!parsed.fullName && (parsed.firstName || parsed.lastName)) {
        parsed.fullName = `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim();
      }

      // Check for combined timeSlot (e.g. "08:30-10:00")
      if (parsed.timeSlot && (!parsed.startTime || !parsed.endTime)) {
        const slot = parseTimeSlot(parsed.timeSlot);
        if (slot) {
          if (!parsed.startTime) parsed.startTime = slot.startTime;
          if (!parsed.endTime) parsed.endTime = slot.endTime;
        }
      }

      // 1. Required field checks
      for (const field of entityDef.fields) {
        if (field.required) {
          if ((field.key === 'firstName' || field.key === 'lastName') && parsed[field.key]) {
            continue;
          }
          if (!parsed[field.key]) {
            errors.push(`Champ obligatoire manquant: '${field.labelFr}'`);
            missingRequiredCount++;
          }
        }
      }

      // 2. Entity-specific validation & conflict checks
      if (config.entityType === 'STUDENT') {
        const sNum = parsed.studentNumber?.toLowerCase();
        const email = parsed.email?.toLowerCase();
        const clsRef = parsed.className?.toLowerCase();

        if (email && !isValidEmail(email)) {
          errors.push(`Format d'email invalide: '${parsed.email}'`);
        }

        // Duplicate checks & diff generation
        if (sNum) {
          if (inSheetSeenKeys.has(sNum)) {
            warnings.push(`Numéro étudiant dupliqué dans ce fichier (${parsed.studentNumber})`);
          } else {
            inSheetSeenKeys.add(sNum);
          }

          const existingStu = dbStudentNumMap.get(sNum) || (email ? dbStudentEmailMap.get(email) : undefined);
          if (existingStu) {
            warnings.push(`Existe déjà dans la base (${existingStu.studentNumber})`);
            diff = {
              existing: {
                matricule: existingStu.studentNumber,
                nom: `${existingStu.firstName} ${existingStu.lastName}`,
                classe: existingStu.class?.name || 'Non assigné',
                email: existingStu.email || '—',
              },
              incoming: {
                matricule: parsed.studentNumber,
                nom: `${parsed.firstName} ${parsed.lastName}`,
                classe: parsed.className,
                email: parsed.email || '—',
              },
            };
          }
        }

        // Class dependency check
        if (clsRef) {
          neededClasses.add(parsed.className);
          const exists = dbClassMap.has(clsRef) || fileProvidedClasses.has(clsRef);
          if (!exists) {
            warnings.push(`Classe '${parsed.className}' non trouvée dans la base, sera créée automatiquement lors de l'import.`);
          }
        }
      } else if (config.entityType === 'TEACHER') {
        const tNum = parsed.teacherNumber?.toLowerCase();
        const email = parsed.email?.toLowerCase();
        const tName = parsed.fullName?.toLowerCase() || `${parsed.firstName} ${parsed.lastName}`.toLowerCase();

        if (email && !isValidEmail(email)) {
          errors.push(`Format d'email invalide: '${parsed.email}'`);
        }

        if (tNum) {
          if (inSheetSeenKeys.has(tNum)) {
            warnings.push(`Matricule enseignant dupliqué dans le fichier (${parsed.teacherNumber})`);
          } else {
            inSheetSeenKeys.add(tNum);
          }
        }

        const existingTch =
          (tNum && dbTeacherNumMap.get(tNum)) ||
          (email && dbTeacherEmailMap.get(email)) ||
          dbTeacherNameMap.get(tName);

        if (existingTch) {
          warnings.push(`Enseignant '${existingTch.firstName} ${existingTch.lastName}' existe déjà en base.`);
          diff = {
            existing: {
              matricule: existingTch.teacherNumber,
              nom: `${existingTch.firstName} ${existingTch.lastName}`,
              departement: existingTch.department || '—',
              email: existingTch.email,
            },
            incoming: {
              matricule: parsed.teacherNumber || existingTch.teacherNumber,
              nom: parsed.fullName || `${parsed.firstName} ${parsed.lastName}`,
              departement: parsed.department || '—',
              email: parsed.email || '—',
            },
          };
        }
      } else if (config.entityType === 'CLASS') {
        const cName = parsed.name?.toLowerCase();
        const cCode = parsed.code?.toLowerCase() || cName;

        if (cName) {
          if (inSheetSeenKeys.has(cName)) {
            warnings.push(`Classe en double dans le fichier: '${parsed.name}'`);
          } else {
            inSheetSeenKeys.add(cName);
          }

          const existingCls = dbClassMap.get(cName) || (cCode ? dbClassMap.get(cCode) : undefined);
          if (existingCls) {
            warnings.push(`Classe '${parsed.name}' existe déjà en base.`);
            diff = {
              existing: {
                nom: existingCls.name,
                code: existingCls.code,
                filiere: existingCls.filiere || '—',
                niveau: existingCls.niveau || '—',
              },
              incoming: {
                nom: parsed.name,
                code: parsed.code || parsed.name,
                filiere: parsed.filiere || '—',
                niveau: parsed.niveau || '—',
              },
            };
          }
        }
      } else if (config.entityType === 'SUBJECT') {
        const sCode = parsed.code?.toLowerCase();
        const sName = parsed.name?.toLowerCase();

        if (sCode) {
          if (inSheetSeenKeys.has(sCode)) {
            warnings.push(`Code matière dupliqué dans le fichier: '${parsed.code}'`);
          } else {
            inSheetSeenKeys.add(sCode);
          }
        }

        const existingSub = (sCode && dbSubjectMap.get(sCode)) || (sName && dbSubjectMap.get(sName));
        if (existingSub) {
          warnings.push(`Matière '${existingSub.name}' (${existingSub.code}) existe déjà en base.`);
          diff = {
            existing: { code: existingSub.code, nom: existingSub.name },
            incoming: { code: parsed.code || '—', nom: parsed.name },
          };
        }
      } else if (config.entityType === 'ROOM') {
        const rName = parsed.name?.toLowerCase();
        if (rName) {
          if (inSheetSeenKeys.has(rName)) {
            warnings.push(`Salle dupliquée dans le fichier: '${parsed.name}'`);
          } else {
            inSheetSeenKeys.add(rName);
          }

          const existingRm = dbRoomMap.get(rName);
          if (existingRm) {
            warnings.push(`Salle '${existingRm.name}' existe déjà en base.`);
            diff = {
              existing: {
                nom: existingRm.name,
                batiment: existingRm.building || '—',
                capacite: existingRm.capacity || '—',
              },
              incoming: {
                nom: parsed.name,
                batiment: parsed.building || '—',
                capacite: parsed.capacity || '—',
              },
            };
          }
        }
      } else if (config.entityType === 'TIMETABLE') {
        // Day validation
        const day = parseDayOfWeek(parsed.dayOfWeek);
        if (!day) {
          errors.push(`Jour de la semaine non reconnu: '${parsed.dayOfWeek}'`);
        } else {
          parsed.dayOfWeek = day;
        }

        // Time validation
        const isValidStart = isValidTimeFormat(parsed.startTime || '');
        const isValidEnd = isValidTimeFormat(parsed.endTime || '');

        if (!isValidStart) {
          errors.push(`Heure de début invalide: '${parsed.startTime || ''}' (attendu format HH:mm)`);
        }
        if (!isValidEnd) {
          errors.push(`Heure de fin invalide: '${parsed.endTime || ''}' (attendu format HH:mm)`);
        }
        if (isValidStart && isValidEnd) {
          if (timeToMinutes(parsed.startTime) >= timeToMinutes(parsed.endTime)) {
            errors.push(
              `L'heure de début (${parsed.startTime}) doit être strictement antérieure à l'heure de fin (${parsed.endTime})`
            );
          }
        }

        // Reference validations
        const cRef = parsed.className?.toLowerCase() || '';
        const tRef = parsed.teacherName?.toLowerCase() || '';
        const sRef = parsed.subjectName?.toLowerCase() || '';
        const rRef = parsed.roomName?.toLowerCase() || '';

        if (cRef) {
          neededClasses.add(parsed.className);
          const found = dbClassMap.has(cRef) || fileProvidedClasses.has(cRef);
          if (!found) {
            warnings.push(`Classe '${parsed.className}' sera créée automatiquement`);
          }
        }

        if (tRef) {
          neededTeachers.add(parsed.teacherName);
          const found =
            dbTeacherNumMap.has(tRef) ||
            dbTeacherNameMap.has(tRef) ||
            fileProvidedTeachers.has(tRef);
          if (!found) {
            warnings.push(`Enseignant '${parsed.teacherName}' sera créé automatiquement`);
          }
        }

        if (sRef) {
          neededSubjects.add(parsed.subjectName);
          const found = dbSubjectMap.has(sRef) || fileProvidedSubjects.has(sRef);
          if (!found) {
            warnings.push(`Matière '${parsed.subjectName}' sera créée automatiquement`);
          }
        }

        if (rRef) {
          neededRooms.add(parsed.roomName);
          const found = dbRoomMap.has(rRef) || fileProvidedRooms.has(rRef);
          if (!found) {
            warnings.push(`Salle '${parsed.roomName}' sera créée automatiquement`);
          }
        }

        // 3. Timetable Scheduling Conflict Detection
        if (day && isValidStart && isValidEnd && errors.length === 0) {
          // A. Teacher Overlap Conflict (against earlier rows in file)
          if (tRef && tRef.trim().length > 0) {
            const teacherConflictInFile = trackedFileTimetables.find(
              (s) =>
                s.dayOfWeek === day &&
                s.teacherRef === tRef &&
                isTimeOverlap(parsed.startTime, parsed.endTime, s.startTime, s.endTime)
            );
            if (teacherConflictInFile) {
              errors.push(
                `Conflit enseignant : ${parsed.teacherName} a déjà une séance le ${parsed.dayOfWeek} de ${teacherConflictInFile.startTime} à ${teacherConflictInFile.endTime} (avec ${teacherConflictInFile.className} en ${teacherConflictInFile.roomName}, ligne ${teacherConflictInFile.line})`
              );
            }

            // Teacher Overlap Conflict (against existing DB entries)
            const teacherConflictInDb = existingTimetables.find(
              (e) =>
                e.dayOfWeek === day &&
                (e.teacher.teacherNumber.toLowerCase() === tRef ||
                  `${e.teacher.firstName} ${e.teacher.lastName}`.toLowerCase().includes(tRef) ||
                  tRef.includes(e.teacher.lastName.toLowerCase())) &&
                isTimeOverlap(parsed.startTime, parsed.endTime, e.startTime, e.endTime)
            );
            if (teacherConflictInDb) {
              errors.push(
                `Conflit enseignant (Base de données) : ${parsed.teacherName} a déjà un cours programmé le ${day} de ${teacherConflictInDb.startTime} à ${teacherConflictInDb.endTime} (Classe: ${teacherConflictInDb.class.name}, Salle: ${teacherConflictInDb.room.name})`
              );
            }
          }

          // B. Room Overlap Conflict (against earlier rows in file)
          if (rRef && rRef.trim().length > 0) {
            const roomConflictInFile = trackedFileTimetables.find(
              (s) =>
                s.dayOfWeek === day &&
                s.roomRef === rRef &&
                isTimeOverlap(parsed.startTime, parsed.endTime, s.startTime, s.endTime)
            );
            if (roomConflictInFile) {
              errors.push(
                `Conflit de salle : La salle '${parsed.roomName}' est déjà occupée le ${parsed.dayOfWeek} de ${roomConflictInFile.startTime} à ${roomConflictInFile.endTime} par ${roomConflictInFile.className} (ligne ${roomConflictInFile.line})`
              );
            }

            // Room Overlap Conflict (against existing DB entries)
            const roomConflictInDb = existingTimetables.find(
              (e) =>
                e.dayOfWeek === day &&
                e.room.name.toLowerCase() === rRef &&
                isTimeOverlap(parsed.startTime, parsed.endTime, e.startTime, e.endTime)
            );
            if (roomConflictInDb) {
              errors.push(
                `Conflit de salle (Base de données) : La salle '${parsed.roomName}' est déjà occupée le ${day} de ${roomConflictInDb.startTime} à ${roomConflictInDb.endTime} par ${roomConflictInDb.class.name}`
              );
            }
          }

          // C. Class Overlap Conflict (against earlier rows in file)
          const classConflictInFile = trackedFileTimetables.find(
            (s) =>
              s.dayOfWeek === day &&
              s.classRef === cRef &&
              isTimeOverlap(parsed.startTime, parsed.endTime, s.startTime, s.endTime)
          );
          if (classConflictInFile) {
            errors.push(
              `Conflit de classe : La classe '${parsed.className}' a déjà un cours le ${parsed.dayOfWeek} de ${classConflictInFile.startTime} à ${classConflictInFile.endTime} (Matière: ${classConflictInFile.subjectName}, ligne ${classConflictInFile.line})`
            );
          }

          // If valid, register in session tracker
          if (errors.length === 0) {
            trackedFileTimetables.push({
              line,
              dayOfWeek: day,
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              teacherRef: tRef,
              teacherName: parsed.teacherName,
              roomRef: rRef,
              roomName: parsed.roomName,
              classRef: cRef,
              className: parsed.className,
              subjectName: parsed.subjectName,
            });
          }
        }
      }

      // Determine item row status
      let status: EntityPreviewItem['status'] = 'VALID';
      if (errors.length > 0) {
        status = 'ERROR';
        errorCount++;
      } else if (warnings.some((w) => w.includes('déjà') || w.includes('dupliqué') || w.includes('existe déjà'))) {
        status = 'DUPLICATE';
        duplicateCount++;
      } else if (warnings.length > 0) {
        status = 'WARNING';
        warningCount++;
      } else {
        validCount++;
      }

      // Record preview items (including diff if present)
      if (previewRows.length < 50 || errors.length > 0) {
        previewRows.push({
          line,
          status,
          raw,
          parsed,
          errors,
          warnings,
          diff,
        });
      }

      // Record field errors
      errors.forEach((msg) => {
        fieldErrors.push({
          line,
          sheetName: config.sheetName,
          message: msg,
          severity: 'error',
        });
      });
      warnings.forEach((msg) => {
        fieldErrors.push({
          line,
          sheetName: config.sheetName,
          message: msg,
          severity: 'warning',
        });
      });
    }

    grandTotal += rawRows.length;
    grandValid += validCount;
    grandWarning += warningCount;
    grandError += errorCount;
    grandDuplicate += duplicateCount;

    sheetResults.push({
      sheetName: config.sheetName,
      entityType: config.entityType,
      totalRows: rawRows.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      missingRequiredCount,
      previewRows,
      fieldErrors: fieldErrors.slice(0, 100),
    });
  }

  const canProceed = grandError === 0 && unresolvedDependencies.size === 0;

  return {
    canProceed,
    sheets: sheetResults,
    overallSummary: {
      totalRecords: grandTotal,
      validRecords: grandValid,
      warningRecords: grandWarning,
      errorRecords: grandError,
      duplicateRecords: grandDuplicate,
      entitiesDetected: Array.from(entitiesDetected),
    },
    dependenciesSummary: {
      classesNeeded: Array.from(neededClasses),
      classesFound: Array.from(fileProvidedClasses).concat(Array.from(dbClassMap.keys())),
      teachersNeeded: Array.from(neededTeachers),
      teachersFound: Array.from(fileProvidedTeachers).concat(Array.from(dbTeacherNumMap.keys())),
      subjectsNeeded: Array.from(neededSubjects),
      subjectsFound: Array.from(fileProvidedSubjects).concat(Array.from(dbSubjectMap.keys())),
      roomsNeeded: Array.from(neededRooms),
      roomsFound: Array.from(fileProvidedRooms).concat(Array.from(dbRoomMap.keys())),
      unresolvedDependencies: Array.from(unresolvedDependencies),
    },
  };
}
