import xlsx from 'xlsx';
import { DayOfWeek, Role, TimetableVersionStatus } from '@prisma/client';
import prisma from '../../config/database.js';
import { generateSecureTemporaryPassword, hashPassword } from '../../utils/password.js';
import { splitFullName, parseTimeSlot } from './dataValidator.js';
import { parseClassInfo } from './fieldDefinitions.js';
import { parseDayOfWeek } from '../timetableImportService.js';
import {
  EntityImportReport,
  ImportExecutionOptions,
  ImportExecutionReport,
  ImportEntityType,
  SheetMappingConfig,
} from './types.js';

export async function executeImportWorkflow(
  fileBuffer: Buffer,
  fileName: string,
  sheetConfigs: SheetMappingConfig[],
  options: ImportExecutionOptions,
  admin: { id: string; name: string; email: string }
): Promise<ImportExecutionReport> {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const reportId = `IMP-${Date.now()}-${Math.random().toString(36).slice(-4).toUpperCase()}`;
  const importedAt = new Date().toISOString();

  // Helper maps for resolving references during this transaction
  const classIdMap = new Map<string, string>();
  const teacherIdMap = new Map<string, string>();
  const subjectIdMap = new Map<string, string>();
  const roomIdMap = new Map<string, string>();

  // Populate maps from existing DB
  const [dbClasses, dbTeachers, dbSubjects, dbRooms] = await Promise.all([
    prisma.class.findMany(),
    prisma.teacher.findMany(),
    prisma.subject.findMany(),
    prisma.room.findMany(),
  ]);

  dbClasses.forEach((c) => {
    classIdMap.set(c.name.toLowerCase(), c.id);
    classIdMap.set(c.code.toLowerCase(), c.id);
  });

  dbTeachers.forEach((t) => {
    teacherIdMap.set(t.teacherNumber.toLowerCase(), t.id);
    teacherIdMap.set(`${t.firstName} ${t.lastName}`.toLowerCase(), t.id);
    teacherIdMap.set(`${t.lastName} ${t.firstName}`.toLowerCase(), t.id);
    teacherIdMap.set(t.lastName.toLowerCase(), t.id);
  });

  dbSubjects.forEach((s) => {
    subjectIdMap.set(s.code.toLowerCase(), s.id);
    subjectIdMap.set(s.name.toLowerCase(), s.id);
  });

  dbRooms.forEach((r) => {
    roomIdMap.set(r.name.toLowerCase(), r.id);
  });

  // Sort configs so dependencies are processed in strict foreign key order
  const order: Record<ImportEntityType, number> = {
    CLASS: 1,
    SUBJECT: 2,
    ROOM: 3,
    TEACHER: 4,
    STUDENT: 5,
    TIMETABLE: 6,
  };

  const sortedConfigs = [...sheetConfigs].sort((a, b) => order[a.entityType] - order[b.entityType]);

  const entityReports: EntityImportReport[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Execute inside Prisma Transaction for safety & atomicity
  await prisma.$transaction(
    async (tx) => {
      for (const config of sortedConfigs) {
        const worksheet = workbook.Sheets[config.sheetName];
        if (!worksheet) continue;

        const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
        const rep: EntityImportReport = {
          entityType: config.entityType,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };

        for (let i = 0; i < rawRows.length; i++) {
          totalProcessed++;
          const row = rawRows[i];
          const line = i + 2;

          try {
            if (config.entityType === 'CLASS') {
              const nameCol = config.columnMappings.name;
              const codeCol = config.columnMappings.code;
              const filiereCol = config.columnMappings.filiere;
              const niveauCol = config.columnMappings.niveau;
              const groupeCol = config.columnMappings.groupe;

              const name = nameCol && row[nameCol] ? String(row[nameCol]).trim() : '';
              if (!name) {
                rep.skipped++;
                totalSkipped++;
                continue;
              }
              const parsedClass = parseClassInfo(name);
              const code = codeCol && row[codeCol] ? String(row[codeCol]).trim() : name;
              const filiere = filiereCol && row[filiereCol] ? String(row[filiereCol]).trim() : parsedClass.filiere;
              const niveau = niveauCol && row[niveauCol] ? String(row[niveauCol]).trim() : parsedClass.niveau;
              const groupe = groupeCol && row[groupeCol] ? String(row[groupeCol]).trim() : parsedClass.groupe;

              const existing = await tx.class.findFirst({
                where: { OR: [{ name }, { code }] },
              });

              if (existing) {
                if (options.strategy === 'UPDATE') {
                  const updateData: any = {};
                  if (filiere) updateData.filiere = filiere;
                  if (niveau) updateData.niveau = niveau;
                  if (groupe) updateData.groupe = groupe;

                  const updated = await tx.class.update({
                    where: { id: existing.id },
                    data: updateData,
                  });
                  classIdMap.set(name.toLowerCase(), updated.id);
                  classIdMap.set(code.toLowerCase(), updated.id);
                  rep.updated++;
                  totalUpdated++;
                } else {
                  classIdMap.set(name.toLowerCase(), existing.id);
                  classIdMap.set(code.toLowerCase(), existing.id);
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                const created = await tx.class.create({
                  data: { name, code, filiere, niveau, groupe },
                });
                classIdMap.set(name.toLowerCase(), created.id);
                classIdMap.set(code.toLowerCase(), created.id);
                rep.inserted++;
                totalInserted++;
              }
            } else if (config.entityType === 'SUBJECT') {
              const nameCol = config.columnMappings.name;
              const codeCol = config.columnMappings.code;

              const name = nameCol && row[nameCol] ? String(row[nameCol]).trim() : '';
              if (!name) {
                rep.skipped++;
                totalSkipped++;
                continue;
              }
              const code =
                codeCol && row[codeCol]
                  ? String(row[codeCol]).trim()
                  : `CRS-${name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

              const existing = await tx.subject.findFirst({
                where: { OR: [{ code }, { name }] },
              });

              if (existing) {
                if (options.strategy === 'UPDATE') {
                  const updated = await tx.subject.update({
                    where: { id: existing.id },
                    data: { name },
                  });
                  subjectIdMap.set(name.toLowerCase(), updated.id);
                  subjectIdMap.set(code.toLowerCase(), updated.id);
                  rep.updated++;
                  totalUpdated++;
                } else {
                  subjectIdMap.set(name.toLowerCase(), existing.id);
                  subjectIdMap.set(code.toLowerCase(), existing.id);
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                const created = await tx.subject.create({
                  data: { name, code },
                });
                subjectIdMap.set(name.toLowerCase(), created.id);
                subjectIdMap.set(code.toLowerCase(), created.id);
                rep.inserted++;
                totalInserted++;
              }
            } else if (config.entityType === 'ROOM') {
              const nameCol = config.columnMappings.name;
              const bldCol = config.columnMappings.building;
              const capCol = config.columnMappings.capacity;

              const name = nameCol && row[nameCol] ? String(row[nameCol]).trim() : '';
              if (!name) {
                rep.skipped++;
                totalSkipped++;
                continue;
              }
              const building = bldCol && row[bldCol] ? String(row[bldCol]).trim() : null;
              const capacity = capCol && row[capCol] ? parseInt(String(row[capCol]), 10) || null : null;

              const existing = await tx.room.findUnique({ where: { name } });
              if (existing) {
                if (options.strategy === 'UPDATE') {
                  const updateData: any = {};
                  if (building) updateData.building = building;
                  if (capacity !== null) updateData.capacity = capacity;

                  const updated = await tx.room.update({
                    where: { id: existing.id },
                    data: updateData,
                  });
                  roomIdMap.set(name.toLowerCase(), updated.id);
                  rep.updated++;
                  totalUpdated++;
                } else {
                  roomIdMap.set(name.toLowerCase(), existing.id);
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                const created = await tx.room.create({
                  data: { name, building, capacity },
                });
                roomIdMap.set(name.toLowerCase(), created.id);
                rep.inserted++;
                totalInserted++;
              }
            } else if (config.entityType === 'TEACHER') {
              const tNumCol = config.columnMappings.teacherNumber;
              const fnCol = config.columnMappings.firstName;
              const lnCol = config.columnMappings.lastName;
              const fullCol = config.columnMappings.fullName;
              const emailCol = config.columnMappings.email;
              const deptCol = config.columnMappings.department;
              const phoneCol = config.columnMappings.phone;

              let firstName = fnCol && row[fnCol] ? String(row[fnCol]).trim() : '';
              let lastName = lnCol && row[lnCol] ? String(row[lnCol]).trim() : '';
              const fullName = fullCol && row[fullCol] ? String(row[fullCol]).trim() : '';

              if (!firstName && !lastName && fullName) {
                const parts = splitFullName(fullName);
                firstName = parts.firstName;
                lastName = parts.lastName;
              }

              if (!lastName) lastName = 'Enseignant';
              if (!firstName) firstName = fullName || 'Professeur';

              const teacherNumber =
                tNumCol && row[tNumCol]
                  ? String(row[tNumCol]).trim()
                  : `TCH-${Date.now().toString().slice(-4)}-${i}`;

              const email =
                emailCol && row[emailCol]
                  ? String(row[emailCol]).trim().toLowerCase()
                  : `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${i}@issatk.rnu.tn`;

              const department = deptCol && row[deptCol] ? String(row[deptCol]).trim() : 'Informatique';
              const phone = phoneCol && row[phoneCol] ? String(row[phoneCol]).trim() : null;

              // Check existing teacher
              const existing = await tx.teacher.findFirst({
                where: { OR: [{ teacherNumber }, { email }] },
              });

              if (existing) {
                if (options.strategy === 'UPDATE') {
                  // Only update teacher profile fields, NEVER overwrite user passwordHash or role
                  const updated = await tx.teacher.update({
                    where: { id: existing.id },
                    data: {
                      firstName,
                      lastName,
                      department: department || existing.department,
                      phone: phone || existing.phone,
                    },
                  });
                  teacherIdMap.set(teacherNumber.toLowerCase(), updated.id);
                  teacherIdMap.set(fullName.toLowerCase(), updated.id);
                  rep.updated++;
                  totalUpdated++;
                } else {
                  teacherIdMap.set(teacherNumber.toLowerCase(), existing.id);
                  teacherIdMap.set(fullName.toLowerCase(), existing.id);
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                // Generate a unique, cryptographically random temporary password per user
                const uniqueTemporaryPassword = generateSecureTemporaryPassword(14);
                const passwordHash = await hashPassword(uniqueTemporaryPassword, 8);

                let user = await tx.user.findUnique({ where: { email } });
                if (!user) {
                  user = await tx.user.create({
                    data: {
                      email,
                      passwordHash,
                      role: Role.TEACHER,
                      isActive: true,
                    },
                  });
                }

                const created = await tx.teacher.create({
                  data: {
                    userId: user.id,
                    teacherNumber,
                    firstName,
                    lastName,
                    email,
                    department,
                    phone,
                  },
                });
                teacherIdMap.set(teacherNumber.toLowerCase(), created.id);
                teacherIdMap.set(fullName.toLowerCase(), created.id);
                rep.inserted++;
                totalInserted++;
              }
            } else if (config.entityType === 'STUDENT') {
              const sNumCol = config.columnMappings.studentNumber;
              const fnCol = config.columnMappings.firstName;
              const lnCol = config.columnMappings.lastName;
              const fullCol = config.columnMappings.fullName;
              const emailCol = config.columnMappings.email;
              const clsCol = config.columnMappings.className;
              const filiereCol = config.columnMappings.filiere;
              const niveauCol = config.columnMappings.niveau;
              const groupeCol = config.columnMappings.groupe;

              const studentNumber = sNumCol && row[sNumCol] ? String(row[sNumCol]).trim() : '';
              if (!studentNumber) {
                rep.skipped++;
                totalSkipped++;
                continue;
              }

              let firstName = fnCol && row[fnCol] ? String(row[fnCol]).trim() : '';
              let lastName = lnCol && row[lnCol] ? String(row[lnCol]).trim() : '';
              const fullName = fullCol && row[fullCol] ? String(row[fullCol]).trim() : '';

              if (!firstName && !lastName && fullName) {
                const parts = splitFullName(fullName);
                firstName = parts.firstName;
                lastName = parts.lastName;
              }
              if (!lastName) lastName = 'Étudiant';
              if (!firstName) firstName = 'Étudiant';

              const email =
                emailCol && row[emailCol]
                  ? String(row[emailCol]).trim().toLowerCase()
                  : `stu${studentNumber}@students.issatk.rnu.tn`;

              // Resolve Class
              const clsRaw = clsCol && row[clsCol] ? String(row[clsCol]).trim() : '';
              const parsedFromCls = parseClassInfo(clsRaw);
              let targetClassId = clsRaw ? classIdMap.get(clsRaw.toLowerCase()) : null;
              let targetClass: any = null;

              if (targetClassId) {
                targetClass = await tx.class.findUnique({ where: { id: targetClassId } });
              } else if (clsRaw) {
                targetClass = await tx.class.findFirst({ where: { name: clsRaw } });
                if (targetClass) {
                  targetClassId = targetClass.id;
                  classIdMap.set(clsRaw.toLowerCase(), targetClass.id);
                }
              }

              if (!targetClassId) {
                const fallbackName = clsRaw || '1BigData1';
                const existingFallback = await tx.class.findFirst({ where: { name: fallbackName } });
                if (existingFallback) {
                  targetClass = existingFallback;
                  targetClassId = existingFallback.id;
                  classIdMap.set(fallbackName.toLowerCase(), existingFallback.id);
                } else {
                  const createdCls = await tx.class.create({
                    data: {
                      name: fallbackName,
                      code: fallbackName,
                      filiere: filiereCol && row[filiereCol] ? String(row[filiereCol]).trim() : parsedFromCls.filiere,
                      niveau: niveauCol && row[niveauCol] ? String(row[niveauCol]).trim() : parsedFromCls.niveau,
                      groupe: groupeCol && row[groupeCol] ? String(row[groupeCol]).trim() : parsedFromCls.groupe,
                    },
                  });
                  targetClass = createdCls;
                  targetClassId = createdCls.id;
                  classIdMap.set(fallbackName.toLowerCase(), createdCls.id);
                }
              }

              // Determine student's filiere, niveau, groupe accurately from row, targetClass, or parsed name
              const studentFiliere = filiereCol && row[filiereCol]
                ? String(row[filiereCol]).trim()
                : (targetClass?.filiere || parsedFromCls.filiere);
              const studentNiveau = niveauCol && row[niveauCol]
                ? String(row[niveauCol]).trim()
                : (targetClass?.niveau || parsedFromCls.niveau);
              const studentGroupe = groupeCol && row[groupeCol]
                ? String(row[groupeCol]).trim()
                : (targetClass?.groupe || parsedFromCls.groupe);

              const existing = await tx.student.findUnique({
                where: { studentNumber },
              });

              if (existing) {
                if (options.strategy === 'UPDATE') {
                  await tx.student.update({
                    where: { id: existing.id },
                    data: {
                      firstName,
                      lastName,
                      email: email || existing.email,
                      filiere: studentFiliere || existing.filiere,
                      niveau: studentNiveau || existing.niveau,
                      groupe: studentGroupe || existing.groupe,
                      classId: targetClassId || existing.classId,
                    },
                  });
                  rep.updated++;
                  totalUpdated++;
                } else {
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                let userId: string | null = null;
                if (options.generateUserAccounts) {
                  let user = await tx.user.findUnique({ where: { email } });
                  if (!user) {
                    const uniquePassword = generateSecureTemporaryPassword(14);
                    const passwordHash = await hashPassword(uniquePassword, 8);
                    user = await tx.user.create({
                      data: {
                        email,
                        passwordHash,
                        role: Role.STUDENT,
                        isActive: true,
                      },
                    });
                  }
                  userId = user.id;
                }

                await tx.student.create({
                  data: {
                    userId,
                    studentNumber,
                    firstName,
                    lastName,
                    email,
                    filiere: studentFiliere,
                    niveau: studentNiveau,
                    groupe: studentGroupe,
                    classId: targetClassId,
                  },
                });
                rep.inserted++;
                totalInserted++;
              }
            } else if (config.entityType === 'TIMETABLE') {
              const dayCol = config.columnMappings.dayOfWeek;
              const startCol = config.columnMappings.startTime;
              const endCol = config.columnMappings.endTime;
              const slotCol = config.columnMappings.timeSlot;
              const classCol = config.columnMappings.className;
              const teacherCol = config.columnMappings.teacherName;
              const subjectCol = config.columnMappings.subjectName;
              const roomCol = config.columnMappings.roomName;

              let startTime = startCol && row[startCol] ? String(row[startCol]).trim() : '';
              let endTime = endCol && row[endCol] ? String(row[endCol]).trim() : '';
              const slotStr = slotCol && row[slotCol] ? String(row[slotCol]).trim() : '';

              if (slotStr && (!startTime || !endTime)) {
                const parsedSlot = parseTimeSlot(slotStr);
                if (parsedSlot) {
                  startTime = parsedSlot.startTime;
                  endTime = parsedSlot.endTime;
                }
              }

              const day = parseDayOfWeek(String(row[dayCol] || ''));
              if (!day || !startTime || !endTime) {
                rep.skipped++;
                totalSkipped++;
                continue;
              }

              // Resolve Class safely with memory map + DB check
              let cName = classCol && row[classCol] ? String(row[classCol]).trim() : '';
              if (!cName) cName = 'Classe Indéfinie';
              let cId = classIdMap.get(cName.toLowerCase());
              if (!cId) {
                const existingCls = await tx.class.findFirst({
                  where: { OR: [{ name: cName }, { code: cName }] },
                });
                if (existingCls) {
                  cId = existingCls.id;
                } else {
                  const cCode = `GRP-${cName.replace(/[^A-Za-z0-9]/g, '-').toUpperCase().slice(0, 10)}-${i}`;
                  const newCls = await tx.class.create({
                    data: { name: cName, code: cCode },
                  });
                  cId = newCls.id;
                }
                classIdMap.set(cName.toLowerCase(), cId);
              }

              // Resolve Teacher safely with memory map + DB check
              let tName = teacherCol && row[teacherCol] ? String(row[teacherCol]).trim() : '';
              if (!tName) tName = 'Enseignant ISSATK';
              let tId = teacherIdMap.get(tName.toLowerCase());
              if (!tId) {
                const parts = tName.split(' ');
                const firstName = parts[0] || 'Enseignant';
                const lastName = parts.slice(1).join(' ') || tName || 'ISSATK';
                const existingTch = await tx.teacher.findFirst({
                  where: {
                    OR: [
                      { firstName, lastName },
                      { firstName: tName, lastName: tName },
                    ],
                  },
                });
                if (existingTch) {
                  tId = existingTch.id;
                } else {
                  const tNum = `TCH-${i}-${Date.now().toString().slice(-4)}`;
                  const tEmail = `prof.${tNum.toLowerCase().replace(/[^a-z0-9]/g, '')}@issatk.rnu.tn`;
                  const tempPassword = generateSecureTemporaryPassword(14);
                  const passwordHash = await hashPassword(tempPassword, 8);

                  const tUser = await tx.user.create({
                    data: {
                      email: tEmail,
                      passwordHash,
                      role: Role.TEACHER,
                    },
                  });
                  const newTch = await tx.teacher.create({
                    data: {
                      userId: tUser.id,
                      teacherNumber: tNum,
                      firstName,
                      lastName,
                      email: tEmail,
                    },
                  });
                  tId = newTch.id;
                }
                teacherIdMap.set(tName.toLowerCase(), tId);
              }

              // Resolve Subject safely with memory map + DB check
              let sName = subjectCol && row[subjectCol] ? String(row[subjectCol]).trim() : '';
              if (!sName) sName = 'Cours';
              let sId = subjectIdMap.get(sName.toLowerCase());
              if (!sId) {
                const existingSub = await tx.subject.findFirst({
                  where: { OR: [{ name: sName }, { code: sName }] },
                });
                if (existingSub) {
                  sId = existingSub.id;
                } else {
                  const sCode = `CRS-${sName.replace(/[^A-Za-z0-9]/g, '-').toUpperCase().slice(0, 8)}-${i}`;
                  const newSub = await tx.subject.create({
                    data: { name: sName, code: sCode },
                  });
                  sId = newSub.id;
                }
                subjectIdMap.set(sName.toLowerCase(), sId);
              }

              // Resolve Room safely with memory map + DB check
              let rName = roomCol && row[roomCol] ? String(row[roomCol]).trim() : '';
              if (!rName) rName = 'Salle Assignée';
              let rId = roomIdMap.get(rName.toLowerCase());
              if (!rId) {
                const existingRoom = await tx.room.findFirst({ where: { name: rName } });
                if (existingRoom) {
                  rId = existingRoom.id;
                } else {
                  const newRoom = await tx.room.create({
                    data: { name: rName },
                  });
                  rId = newRoom.id;
                }
                roomIdMap.set(rName.toLowerCase(), rId);
              }

              // Resolve or create TimetableVersion
              let version = await tx.timetableVersion.findFirst({
                where: { status: TimetableVersionStatus.ACTIVE },
              });
              if (!version) {
                version = await tx.timetableVersion.create({
                  data: {
                    name: options.timetableVersionName || 'Semestre en cours (Importé)',
                    validFrom: new Date(),
                    validUntil: new Date(Date.now() + 180 * 24 * 3600 * 1000),
                    status: TimetableVersionStatus.ACTIVE,
                  },
                });
              }

              // Avoid duplicate timetable entry
              const existingEntry = await tx.timetableEntry.findFirst({
                where: {
                  timetableVersionId: version.id,
                  dayOfWeek: day,
                  startTime,
                  endTime,
                  classId: cId,
                },
              });

              if (existingEntry) {
                if (options.strategy === 'UPDATE') {
                  await tx.timetableEntry.update({
                    where: { id: existingEntry.id },
                    data: { teacherId: tId, subjectId: sId, roomId: rId },
                  });
                  rep.updated++;
                  totalUpdated++;
                } else {
                  rep.skipped++;
                  totalSkipped++;
                }
              } else {
                await tx.timetableEntry.create({
                  data: {
                    timetableVersionId: version.id,
                    dayOfWeek: day,
                    startTime,
                    endTime,
                    teacherId: tId,
                    classId: cId,
                    subjectId: sId,
                    roomId: rId,
                  },
                });
                rep.inserted++;
                totalInserted++;
              }
            }
          } catch (err: any) {
            rep.failed++;
            totalFailed++;
            rep.errors.push(`Ligne ${line}: ${err.message || 'Erreur inconnue'}`);
          }
        }

        entityReports.push(rep);
      }
    },
    {
      maxWait: 30000,
      timeout: 180000, // 180s timeout for large datasets
    }
  );

  const finalStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
    totalFailed === 0 ? 'SUCCESS' : totalInserted + totalUpdated > 0 ? 'PARTIAL' : 'FAILED';

  const report: ImportExecutionReport = {
    id: reportId,
    fileName,
    importedAt,
    adminId: admin.id,
    adminName: admin.name || admin.email,
    status: finalStatus,
    totalProcessed,
    totalInserted,
    totalUpdated,
    totalSkipped,
    totalFailed,
    strategyUsed: options.strategy,
    entityReports,
  };

  // Log in Activity table for persistent audit
  try {
    await prisma.activity.create({
      data: {
        kind: 'DATA_IMPORT',
        message: JSON.stringify(report),
        actorUserId: admin.id,
        subjectUserIds: [],
      },
    });
  } catch (e) {
    console.error('Failed to write import history to activity log:', e);
  }

  return report;
}
